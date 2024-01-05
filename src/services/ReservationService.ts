import { Employee, Frequency, type Reservation, Status } from '@prisma/client';
import short from 'short-uuid';
import type { RequireAtLeastOne } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import prisma from '~/lib/prisma';

import type { ReservationCreationData } from '~/schemas/reservation';

import {
  includeAllVisitData,
  serviceInclude,
  visitPartWithEmployee
} from '~/queries/serviceQuery';

import {
  advanceDateByOneYear,
  isAfter,
  isAtLeastOneDayBetween
} from '~/utils/dateUtils';
import { executeDatabaseOperation } from '~/utils/queryUtils';
import {
  checkReservationConflict,
  createVisits
} from '~/utils/reservationUtils';
import {
  flattenNestedReservationServices,
  flattenNestedVisits
} from '~/utils/visits';

export type ReservationQueryOptions = RequireAtLeastOne<{
  includeVisits: boolean;
  includeServices: boolean;
  includeAddress: boolean;
  employeeId: number;
}>;

export default class ReservationService {
  public async getAllReservations(statuses?: Reservation['status'][]) {
    return await prisma.$transaction(async (tx) => {
      const allReservations = await tx.reservation.findMany({
        where: { status: { in: statuses } },
        include: {
          visits: {
            include: {
              visitParts: visitPartWithEmployee
              // include services only if the option is true
            }
          },
          services: serviceInclude
        }
      });

      return (
        allReservations.map((reservation) => ({
          ...reservation,
          visits: flattenNestedVisits(reservation.visits),
          services: flattenNestedReservationServices(reservation.services)
        })) ?? null
      );
    });
  }

  public async getReservationByName(
    name: Reservation['name'],
    options?: ReservationQueryOptions
  ) {
    const reservationData = await prisma.reservation.findUnique({
      where: { name },
      include: {
        // include visits only if the option is true
        visits: includeAllVisitData,
        // include address only if the option is true
        address: options?.includeAddress,
        services: serviceInclude
      }
    });

    if (!reservationData) {
      return null;
    }

    return {
      ...reservationData,
      visits: flattenNestedVisits(reservationData.visits),
      services: flattenNestedReservationServices(reservationData.services)
    };
  }

  public async getVisits(name: Reservation['name']) {
    const reservation = await this.getReservationByName(name);

    if (!reservation) {
      return null;
    }

    const visits = await executeDatabaseOperation(
      prisma.visit.findMany({
        where: { reservationId: reservation.id },
        include: {
          visitParts: visitPartWithEmployee
        }
      })
    );

    return visits ? flattenNestedVisits(visits) : [];
  }

  public async createReservation(data: ReservationCreationData) {
    return await prisma.$transaction(async (tx) => {
      const allPendingReservations = await tx.reservation.findMany({
        where: {
          status: { in: [Status.ACTIVE, Status.TO_BE_CONFIRMED] },
          visits: {
            some: {
              visitParts: {
                some: {
                  employeeId: {
                    in: data.visitParts.map(({ employeeId }) => employeeId)
                  }
                }
              }
            }
          }
        },
        select: {
          visits: {
            select: {
              visitParts: visitPartWithEmployee
            }
          }
        }
      });

      const {
        bookerEmail,
        frequency,
        address,
        contactDetails,
        visitParts,
        services,
        extraInfo
      } = data;

      const { firstName: bookerFirstName, lastName: bookerLastName } =
        contactDetails;

      const visitPartTimeslots = visitParts.map(
        ({ startDate, endDate, ...other }) => ({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          ...other
        })
      );

      const lastEndDate = visitPartTimeslots.at(-1)!.endDate;
      const endDate =
        frequency !== Frequency.ONCE
          ? new Date(advanceDateByOneYear(lastEndDate))
          : lastEndDate;
      const newVisits = createVisits(data, frequency, endDate.toISOString());

      const visitPartEmployees = visitPartTimeslots.map(
        ({ employeeId }) => employeeId
      );
      const allPendingVisits = flattenNestedVisits(
        allPendingReservations.flatMap((reservation) => reservation.visits)
      );

      const conflicts = checkReservationConflict(
        newVisits,
        allPendingVisits,
        visitPartEmployees
      );

      if (conflicts.length > 0) {
        throw new RequestError(
          'Cannot create reservation because of conflicting dates with other reservations'
        );
      }

      if (!lastEndDate) {
        return null;
      }

      const addressRecord = await tx.address.findFirst({
        where: typeof address === 'number' ? { id: address } : { ...address }
      });

      if (!addressRecord) {
        throw new RequestError('Invalid address');
      }

      const addressId = addressRecord.id;

      return await tx.reservation.create({
        data: {
          status: Status.TO_BE_CONFIRMED,
          name: `reservation-${short.generate()}`,
          frequency,
          bookerFirstName,
          bookerLastName,
          extraInfo,
          visits: {
            create: newVisits.map((visit) => ({
              ...visit,
              visitParts: {
                create: visitParts.map((visitPart) => ({
                  ...visitPart,
                  status: Status.TO_BE_CONFIRMED
                }))
              }
            }))
          },
          address: {
            connect: {
              id: addressId
            }
          },
          client: {
            connectOrCreate: {
              where: {
                email: bookerEmail
              },
              create: {
                email: bookerEmail
              }
            }
          },
          services: {
            createMany: {
              data: services
            }
          }
        }
      });
    });
  }

  public async cancelReservation(name: Reservation['name']) {
    return await prisma.$transaction(async (tx) => {
      let reservation: Reservation | null = null;
      const oldReservation = await this.getReservationByName(name);
      if (!oldReservation) {
        return null;
      }

      const reservationVisits = await tx.visit.findMany({
        where: { reservationId: oldReservation.id },
        include: {
          visitParts: visitPartWithEmployee
        }
      });

      const visits = reservationVisits
        ? flattenNestedVisits(reservationVisits)
        : [];

      if (!oldReservation || !visits) {
        return reservation;
      }

      const visitPartsAfterNow = visits
        .flatMap(({ visitParts }) =>
          visitParts.filter(({ startDate }) => isAfter(startDate, new Date()))
        )
        .map(({ id }) => id);

      reservation = await tx.reservation.update({
        where: { name },
        data: {
          status: Status.CANCELLED,
          visits: {
            update: oldReservation.visits.map((visit) => ({
              where: { id: visit.id },
              data: {
                includeDetergents: false,
                canDateBeChanged: false,
                visitParts: {
                  updateMany: visit.visitParts.map((visitPart) => ({
                    where: { id: { in: visitPartsAfterNow } },
                    data: {
                      status: Status.CANCELLED,
                      cost: isAtLeastOneDayBetween(
                        new Date(),
                        visitPart.startDate
                      )
                        ? 0
                        : visitPart.cost.toNumber() / 2
                    }
                  }))
                }
              }
            }))
          }
        }
        // TODO: receive reservation details from here
        // include: {
        //   visits: includeAllVisitData,
        //   // include address only if the option is true
        //   address: true,
        //   services: serviceInclude
        // }
      });

      return this.getReservationByName(reservation.name);
    });
  }

  public async closeReservation(reservationId: Reservation['id']) {
    return await prisma.$transaction(async (tx) => {
      let reservation: Reservation | null = null;

      const visitParts = await tx.visitPart.findMany({
        where: {
          status: Status.ACTIVE,
          visit: {
            reservationId
          }
        }
      });

      if ((visitParts?.length ?? 0) > 0) {
        return null;
      }

      reservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: Status.CLOSED
        }
      });

      return reservation;
    });
  }

  public async closeReservations(reservationIds: Array<Reservation['id']>) {
    return await prisma.$transaction(async (tx) => {
      let reservationUpdateCount = 0;

      const visitParts = await tx.visitPart.findMany({
        where: {
          status: Status.ACTIVE,
          visit: {
            reservationId: { in: reservationIds }
          }
        }
      });

      if ((visitParts?.length ?? 0) > 0) {
        return null;
      }

      const payload = await tx.reservation.updateMany({
        where: { id: { in: reservationIds } },
        data: {
          status: Status.CLOSED
        }
      });

      reservationUpdateCount = payload.count;

      return reservationUpdateCount;
    });
  }

  public async confirmReservation(
    reservationName: Reservation['name'],
    employeeId: Employee['id']
  ) {
    return await prisma.$transaction(async (tx) => {
      await tx.visitPart.updateMany({
        where: {
          visit: { reservation: { name: reservationName } },
          employeeId
        },
        data: {
          status: Status.ACTIVE
        }
      });

      const visitStatuses = await tx.visitPart.findMany({
        where: {
          visit: {
            reservation: { name: reservationName }
          }
        }
      });

      if (visitStatuses.every(({ status }) => status === Status.ACTIVE)) {
        const reservation = await tx.reservation.update({
          where: { name: reservationName },
          data: {
            status: Status.ACTIVE
          },
          include: {
            visits: includeAllVisitData,
            address: true,
            services: serviceInclude
          }
        });

        return {
          ...reservation,
          visits: flattenNestedVisits(reservation.visits),
          services: flattenNestedReservationServices(reservation.services)
        };
      }

      return this.getReservationByName(reservationName);
    });
  }
}
