import {
  type Client,
  Employee,
  Frequency,
  type Reservation,
  Status
} from '@prisma/client';
import { omit } from 'lodash';
import short from 'short-uuid';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

import type { ReservationCreationData } from '~/schemas/reservation';

import {
  includeAllVisitData,
  selectEmployee,
  serviceInclude,
  serviceWithUnit,
  visitPartWithEmployee
} from '~/queries/serviceQuery';

import {
  advanceDateByOneYear,
  extractWeekDayFromDate
} from '~/utils/dateUtils';
import {
  executeDatabaseOperation,
  includeIfTrue,
  includeWithOtherDataIfTrue
} from '~/utils/queryUtils';
import {
  cancelVisits,
  changeVisitFrequency,
  changeWeekDay,
  createVisits
} from '~/utils/reservations';
import { flattenNestedVisits } from '~/utils/visits';

export type ReservationQueryOptions = RequireAtLeastOne<{
  includeVisits: boolean;
  includeServices: boolean;
  includeAddress: boolean;
  employeeId: number;
}>;

export default class ReservationService {
  public async getAllReservations(options?: ReservationQueryOptions) {
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
    if (options?.includeVisits) {
      const reservationData = await executeDatabaseOperation(
        prisma.reservation.findUnique({
          where: { name },
          include: {
            // include visits only if the option is true
            visits: includeAllVisitData,
            // include address only if the option is true
            address: options?.includeAddress
          }
        })
      );

      if (!reservationData) {
        return null;
      }

      return {
        ...reservationData,
        visits: flattenNestedVisits(reservationData.visits)
      };
    }

    return await executeDatabaseOperation(
      prisma.reservation.findUnique({
        where: { name },
        include: {
          // include address only if the option is true
          address: options?.includeAddress
        }
      })
    );
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
      visitData: { visitParts },
      services,
      visitData,
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
        const addressRecord = await prisma.address.create({
          data: {
            ...address
          }
        });

        addressId = addressRecord.id;
      }

      reservation = await prisma.reservation.create({
        data: {
          status: Status.TO_BE_CONFIRMED,
          weekDay: extractWeekDayFromDate(endDate),
          visits: {
            create: createVisits(
              reservationGroupName,
              visitData,
              frequency,
              endDate
            )
          },
          name: reservationGroupName,
          frequency,
          endDate, // not sure if end date should be set on the
          // frontend or on the backend side
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

  // TODO: To be improved
  public async changeFrequency(data: Pick<Reservation, 'id' | 'frequency'>) {
    const { id, frequency } = data;
    let reservation: Reservation | null = null;

    // const visits = await this.getVisits(id);

    // const oldReservation = await this.getReservationById(id);

    // if (!visits || !oldReservation) {
    //   return reservation;
    // }

    // const { frequency: oldFrequency } = oldReservation;

    // if (
    //   oldFrequency !== frequency &&
    //   oldFrequency !== Frequency.ONCE &&
    //   frequency !== Frequency.ONCE
    // ) {
    //   const newVisits = changeVisitFrequency(
    //     visits,
    //     frequency,
    //     oldReservation.name
    //   );

    //   try {
    //     reservation = await prisma.reservation.update({
    //       where: { id },
    //       data: {
    //         frequency,
    //         status: Status.TO_BE_CONFIRMED,
    //         visits: {
    //           createMany: {
    //             // updateMany may not work because that function updates already existing records only
    //             // recommendation - create new reservations based on new ones
    //             // and after confirmation remove old ones
    //             data: newVisits.map((visit) => ({
    //               name: visit.name,
    //               startDate: visit.startDate,
    //               endDate: visit.endDate,
    //               includeDetergents: visit.includeDetergents,
    //               cost: visit.cost,
    //               status: visit.status
    //             }))
    //           }
    //         }
    //       }
    //     });
    //   } catch (err) {
    //     console.error(err);
    //   }
    // }

    return reservation;
  }

  // TODO: To be improved
  public async changeWeekDay(
    data: Pick<Reservation, 'id' | 'weekDay' | 'frequency'>
  ) {
    const { id, weekDay, frequency } = data;
    let reservation: Reservation | null = null;

    // const visits = await this.getVisits(id);

    // if (!visits) {
    //   return reservation;
    // }

    // const newVisits = changeWeekDay(visits, weekDay, frequency);

    // try {
    //   reservation = await prisma.reservation.update({
    //     where: { id },
    //     data: {
    //       status: Status.TO_BE_CONFIRMED,
    //       visits: {
    //         updateMany: {
    //           where: { reservationId: id },
    //           data: newVisits
    //         }
    //       }
    //     }
    //   });
    // } catch (err) {
    //   console.error(err);
    // }

    return reservation;
  }

  // TODO: To be improved
  public async cancelReservation(name: Reservation['name']) {
    let reservation: Reservation | null = null;
    const oldReservation = await this.getReservationByName(name);
    if (!oldReservation) {
      return null;
    }

    const visits = await this.getVisits(oldReservation.name);

    // if (!oldReservation || !visits) {
    //   return reservation;
    // }

    // const { frequency } = oldReservation;

    // const newVisits = cancelVisits(visits, frequency);

    // try {
    //   reservation = await prisma.reservation.update({
    //     where: { id },
    //     data: {
    //       status: Status.TO_BE_CANCELLED,
    //       visits: {
    //         updateMany: {
    //           where: { reservationId: id },
    //           data: newVisits
    //         }
    //       }
    //     }
    //   });
    // } catch (err) {
    //   console.error(err);
    // }

    return reservation;
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

  // TODO This should work but test it
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

  // TODO FIXME: this is not working
  public async autoCloseReservation(id: Reservation['id']) {
    let reservationToClose: Reservation | null = null;

    // const visits = await this.getVisits(id);

    // if (!visits) {
    //   return reservationToClose;
    // }

    // const finishedVisits = visits.filter((visit) =>
    //   visit.employees.every(
    //     ({ status }) => status === Status.CANCELLED || status === Status.CLOSED
    //   )
    // );

    // if (finishedVisits.length === visits.length) {
    //   try {
    //     reservationToClose = await prisma.reservation.update({
    //       where: { id },
    //       data: {
    //         status: Status.CLOSED
    //       }
    //     });
    //   } catch (err) {
    //     console.error(`Something went wrong: ${err}`);
    //   }
    // }

    return reservationToClose;
  }
}
