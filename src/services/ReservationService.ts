import { Employee, Frequency, type Reservation, Status } from '@prisma/client';
import short from 'short-uuid';
import type { RequireAtLeastOne } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import prisma from '~/lib/prisma';

import type { ReservationCreationData } from '~/schemas/reservation';

import {
  includeAllVisitData,
  includeFullReservationDetails,
  reservationWithGivenStatuses,
  serviceInclude,
  visitPartWithEmployee,
  visitPartstWithGivenStatuses
} from '~/queries/serviceQuery';

import { Scheduler } from '~/utils/Scheduler';
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
  public async getAllReservations(statuses: Status[] = []) {
    return await prisma.$transaction(async (tx) => {
      const allReservations = await tx.reservation.findMany({
        where: {
          ...reservationWithGivenStatuses(statuses)
        },
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

  public async getReservationByName(name: Reservation['name']) {
    const reservationData = await prisma.reservation.findUnique({
      where: { name },
      ...includeFullReservationDetails
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
          visits: {
            some: {
              visitParts: {
                some: {
                  ...visitPartstWithGivenStatuses([
                    Status.ACTIVE,
                    Status.TO_BE_CONFIRMED
                  ]),
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

      const visitPartEmployees = visitPartTimeslots.map(
        ({ employeeId }) => employeeId
      );
      const allPendingVisits = flattenNestedVisits(
        allPendingReservations.flatMap((reservation) => reservation.visits)
      );

      const newVisits = createVisits(data, frequency, endDate.toISOString());

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

      return await tx.reservation.create({
        data: {
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
            create: address
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
          visits: {
            update: oldReservation.visits.map((visit) => ({
              where: { id: visit.id },
              data: {
                detergentsCost: 0,
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
      });

      const reservationVisitParts = await tx.visitPart.findMany({
        where: {
          visit: { reservationId: reservation.id },
          status: Status.CANCELLED
        }
      });

      Scheduler.getInstance() &&
        reservationVisitParts.forEach((visitPart) => {
          Scheduler.getInstance()?.cancelJob(`${visitPart.id}`);
        });

      return reservation;
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

      const reservationVisitParts = await tx.visitPart.findMany({
        where: {
          visit: { reservation: { name: reservationName } },
          employeeId
        }
      });

      reservationVisitParts.forEach((visitPart) => {
        Scheduler.getInstance().scheduleJob(
          `${visitPart.id}`,
          visitPart.startDate,
          () =>
            tx.visitPart.updateMany({
              where: { id: { in: reservationVisitParts.map(({ id }) => id) } },
              data: {
                status: Status.CLOSED
              }
            })
        );
      });

      return await this.getReservationByName(reservationName);
    });
  }
}
