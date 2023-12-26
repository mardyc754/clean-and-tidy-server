import {
  type Client,
  Employee,
  Frequency,
  type Reservation,
  Status
} from '@prisma/client';
import short from 'short-uuid';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

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
import {
  executeDatabaseOperation,
  includeWithOtherDataIfTrue
} from '~/utils/queryUtils';
import { createVisits } from '~/utils/reservationUtils';
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
  public async getAllReservations() {
    return await executeDatabaseOperation(
      prisma.reservation.findMany({
        include: {
          visits: {
            include: {
              visitParts: visitPartWithEmployee
              // include services only if the option is true
            }
          },
          services: serviceInclude
        }
      })
    );
  }

  public async getReservationById(
    id: Reservation['id'],
    options?: ReservationQueryOptions
  ) {
    return await executeDatabaseOperation(
      prisma.reservation.findUnique({
        where: { id },
        include: {
          ...includeWithOtherDataIfTrue(
            'visits',
            'employees',
            options?.includeVisits
          )
        }
      })
    );
  }

  public async getReservationByName(
    name: Reservation['name'],
    options?: ReservationQueryOptions
  ) {
    const reservationData = await executeDatabaseOperation(
      prisma.reservation.findUnique({
        where: { name },
        include: {
          // include visits only if the option is true
          visits: includeAllVisitData,
          // include address only if the option is true
          address: options?.includeAddress,
          services: serviceInclude
        }
      })
    );

    if (!reservationData) {
      return null;
    }

    return {
      ...reservationData,
      visits: flattenNestedVisits(reservationData.visits),
      services: flattenNestedReservationServices(reservationData.services)
    };
  }

  public async getClientReservations(
    clientEmail: Client['email'],
    status?: Status
  ) {
    return await executeDatabaseOperation(
      prisma.reservation.findMany({
        where: { bookerEmail: clientEmail },
        include: {
          visits: {
            include: {
              visitParts: { where: { status } }
            }
          },
          services: {
            include: {
              service: true
            }
          }
        }
      })
    );
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
    const reservationGroupName = `reservation-${short.generate()}`;
    let reservation: Reservation | null = null;

    const {
      bookerEmail,
      frequency,
      address,
      contactDetails: { firstName: bookerFirstName, lastName: bookerLastName },
      visitParts,
      services,
      includeDetergents,
      extraInfo
    } = data;

    const lastEndDate = visitParts.at(-1)?.endDate;

    if (!lastEndDate) {
      return null;
    }

    const endDate =
      frequency !== Frequency.ONCE
        ? advanceDateByOneYear(lastEndDate)
        : lastEndDate;

    try {
      let addressId: number;

      if (typeof address === 'number') {
        addressId = address;
      } else {
        const addressRecord = await prisma.address.findFirst({
          where: { ...address }
        });

        if (!addressRecord) {
          return null;
        }

        addressId = addressRecord.id;
      }

      reservation = await prisma.reservation.create({
        data: {
          status: Status.TO_BE_CONFIRMED,
          visits: {
            create: createVisits(
              { visitParts, includeDetergents },
              frequency,
              endDate
            )
          },
          name: reservationGroupName,
          frequency,
          bookerFirstName,
          bookerLastName,
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
          extraInfo: extraInfo ?? null,
          services: {
            createMany: {
              data: services
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
      reservation = null;
    }

    return reservation;
  }

  public async cancelReservation(name: Reservation['name']) {
    let reservation: Reservation | null = null;
    const oldReservation = await this.getReservationByName(name);
    if (!oldReservation) {
      return null;
    }

    const visits = await this.getVisits(oldReservation.name);

    if (!oldReservation || !visits) {
      return reservation;
    }

    const visitPartsAfterNow = visits
      .flatMap(({ visitParts }) =>
        visitParts.filter(({ startDate }) => isAfter(startDate, new Date()))
      )
      .map(({ id }) => id);

    try {
      reservation = await prisma.reservation.update({
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
    } catch (err) {
      console.error(err);
    }

    if (!reservation) {
      return null;
    }

    return this.getReservationByName(reservation.name);
  }

  public async changeStatus(
    reservationId: Reservation['id'],
    employeeId: Employee['id'],
    newStatus: Status
  ) {
    let reservation: Reservation | null = null;

    try {
      reservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: newStatus
        }
      });
    } catch (err) {
      console.error(err);
    }
    return reservation;
  }

  public async confirmReservation(
    reservationName: Reservation['name'],
    employeeId: Employee['id']
  ) {
    const reservation = await this.getReservationByName(reservationName);

    if (!reservation) {
      return null;
    }

    await prisma.visitPart.updateMany({
      where: {
        visit: { reservation: { name: reservationName } },
        employeeId
      },
      data: {
        status: Status.ACTIVE
      }
    });

    const visitStatuses = await executeDatabaseOperation(
      prisma.visitPart.findMany({
        where: {
          visit: {
            reservation: { name: reservationName }
          }
        }
      })
    );

    if (visitStatuses?.every(({ status }) => status === Status.ACTIVE)) {
      return await executeDatabaseOperation(
        prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: Status.ACTIVE
          }
        })
      );
    }

    return reservation;
  }
}
