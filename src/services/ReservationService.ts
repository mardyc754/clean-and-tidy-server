import { Employee, Frequency, type Reservation, Status } from '@prisma/client';
import short from 'short-uuid';
import type { RequireAtLeastOne } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import prisma from '~/lib/prisma';

import type { ReservationCreationData } from '~/schemas/reservation';

import {
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
import { flattenNestedReservationServices } from '~/utils/visits';

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
            }
          },
          services: serviceInclude,
          address: true
        }
      });

      return (
        allReservations.map((reservation) => ({
          ...reservation,
          visits: reservation.visits,
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
      visits: reservationData.visits,
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

    return visits ?? [];
  }

  /**
   * Create reservation
   *
   * Example body:
   *
   * ```json
   * {
   *     "frequency": "EVERY_TWO_WEEKS",
   *     "detergentsCost": 15,
   *     "visitParts": [
   *         {
   *             "serviceId": 1,
   *             "numberOfUnits": 44,
   *             "employeeId": 9,
   *             "startDate": "2024-01-16T09:30:00.000Z",
   *             "endDate": "2024-01-16T13:54:00.000Z",
   *             "cost": 220
   *         }
   *     ],
   *     "bookerEmail": "test@example.com",
   *     "address": {
   *         "street": "Testowa",
   *         "houseNumber": "123",
   *         "postCode": "31-526"
   *     },
   *     "contactDetails": {
   *         "firstName": "Jan",
   *         "lastName": "Testowy",
   *         "email": "test@example.com",
   *         "phone": "+48123456789"
   *     },
   *     "services": [
   *         {
   *             "serviceId": 1,
   *             "isMainServiceForReservation": true
   *         }
   *     ],
   *     "extraInfo": null
   * }
   * ```
   * @param data
   * @returns
   */
  public async createReservation(data: ReservationCreationData) {
    const allPendingReservations = await prisma.reservation.findMany({
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
      ...includeFullReservationDetails
    });

    const {
      bookerEmail,
      frequency,
      address,
      contactDetails,
      visitParts: firstVisitParts,
      services,
      extraInfo
    } = data;

    const { firstName: bookerFirstName, lastName: bookerLastName } =
      contactDetails;

    const visitPartTimeslots = firstVisitParts.map(
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
    const allPendingVisits = allPendingReservations.flatMap(
      (reservation) => reservation.visits
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

    return await prisma.reservation.create({
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
              create: visit.visitParts.map((visitPart) => ({
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
              email: bookerEmail,
              firstName: bookerFirstName,
              lastName: bookerLastName
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
  }

  public async cancelReservation(name: Reservation['name']) {
    // return await prisma.$transaction(async (tx) => {
    let reservation: Reservation | null = null;
    const oldReservation = await this.getReservationByName(name);
    if (!oldReservation) {
      return null;
    }

    const reservationVisits = await prisma.visit.findMany({
      where: { reservationId: oldReservation.id },
      include: {
        visitParts: visitPartWithEmployee
      }
    });

    if (!reservationVisits) {
      return oldReservation;
    }

    const visits = reservationVisits;

    if (!visits) {
      return oldReservation;
    }

    const visitPartsAfterNow = visits
      .flatMap(({ visitParts }) =>
        visitParts.filter(({ startDate }) => isAfter(startDate, new Date()))
      )
      .map(({ id }) => id);

    reservation = await prisma.reservation.update({
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

    const reservationVisitParts = await prisma.visitPart.findMany({
      where: {
        visit: { reservationId: reservation.id },
        status: Status.CANCELLED
      }
    });

    reservationVisitParts.forEach((visitPart) => {
      Scheduler.getInstance().cancelJob(`${visitPart.id}`);
    });

    return this.getReservationByName(name);
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
          visitPart.endDate,
          async () => {
            await prisma.visitPart.updateMany({
              where: { id: { in: reservationVisitParts.map(({ id }) => id) } },
              data: {
                status: Status.CLOSED
              }
            });
          }
        );
      });

      return await this.getReservationByName(reservationName);
    });
  }
}
