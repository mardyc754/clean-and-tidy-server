import {
  type Reservation,
  type Visit,
  Frequency,
  Status
} from '@prisma/client';
import short from 'short-uuid';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';
import {
  cancelVisits,
  changeMultipleVisitsStatus,
  changeVisitFrequency,
  changeWeekDay,
  createVisits
} from '~/utils/reservations';
import {
  advanceDateByOneYear,
  extractWeekDayFromDate
} from '~/utils/dateUtils';

import type { ReservationCreationData } from '~/schemas/reservation';

import {
  executeDatabaseOperation,
  includeIfTrue,
  includeWithOtherDataIfTrue
} from './utils';

export type ReservationQueryOptions = RequireAtLeastOne<{
  includeVisits: boolean;
  includeServices: boolean;
  includeAddress: boolean;
}>;

export default class ReservationService {
  public async getAllReservations(options?: ReservationQueryOptions) {
    let reservations: Reservation[] | null = null;

    try {
      reservations = await prisma.reservation.findMany({
        include: {
          ...includeIfTrue('reservations', options?.includeVisits)
        }
      });
    } catch (err) {
      console.error(err);
    }

    return reservations;
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
    return await executeDatabaseOperation(
      prisma.reservation.findUnique({
        where: { name },
        include: {
          ...includeWithOtherDataIfTrue(
            'visits',
            'employees',
            options?.includeVisits
          ),
          // in order to include service data associated with reservation
          ...includeWithOtherDataIfTrue(
            'services',
            'service',
            options?.includeServices
          ),
          // get the address associated with the reservation
          ...includeIfTrue('address', options?.includeAddress)
        }
      })
    );
  }

  public async getVisits(id: Visit['id']) {
    let visits: Visit[] | null = [];

    try {
      visits = await prisma.visit.findMany({
        where: { reservationId: id }
      });
    } catch (err) {
      console.error(err);
    }

    return visits;
  }

  public async createReservation(data: ReservationCreationData) {
    const reservationGroupName = `reservation-${short.generate()}`;
    let reservation: Reservation | null = null;

    const {
      bookerEmail,
      frequency,
      address,
      contactDetails: { firstName: bookerFirstName, lastName: bookerLastName },
      services,
      visitData
    } = data;

    const endDate =
      frequency !== Frequency.ONCE
        ? advanceDateByOneYear(visitData.endDate)
        : visitData.endDate;

    const reservations = createVisits(
      reservationGroupName, // TODO: it can be changed to normal id later because right now, the name will be too long
      visitData,
      frequency,
      endDate
    );

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
            create: reservations.map((reservation) => ({
              ...reservation,
              employees: {
                connect: visitData.employeeIds.map((id) => ({ id }))
              }
            }))
          },
          services: {
            create: services
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

    const visits = await this.getVisits(id);

    const oldReservation = await this.getReservationById(id);

    if (!visits || !oldReservation) {
      return reservation;
    }

    const { frequency: oldFrequency } = oldReservation;

    if (
      oldFrequency !== frequency &&
      oldFrequency !== Frequency.ONCE &&
      frequency !== Frequency.ONCE
    ) {
      const newVisits = changeVisitFrequency(
        visits,
        frequency,
        oldReservation.name
      );

      try {
        reservation = await prisma.reservation.update({
          where: { id },
          data: {
            frequency,
            status: Status.TO_BE_CONFIRMED,
            visits: {
              createMany: {
                // updateMany may not work because that function updates already existing records only
                // recommendation - create new reservations based on new ones
                // and after confirmation remove old ones
                data: newVisits.map((visit) => ({
                  name: visit.name,
                  startDate: visit.startDate,
                  endDate: visit.endDate,
                  includeDetergents: visit.includeDetergents,
                  cost: visit.cost,
                  status: visit.status
                }))
              }
            }
          }
        });
      } catch (err) {
        console.error(err);
      }
    }

    return reservation;
  }

  // TODO: To be improved
  public async changeWeekDay(
    data: Pick<Reservation, 'id' | 'weekDay' | 'frequency'>
  ) {
    const { id, weekDay, frequency } = data;
    let reservation: Reservation | null = null;

    const visits = await this.getVisits(id);

    if (!visits) {
      return reservation;
    }

    const newVisits = changeWeekDay(visits, weekDay, frequency);

    try {
      reservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: Status.TO_BE_CONFIRMED,
          visits: {
            updateMany: {
              where: { reservationId: id },
              data: newVisits
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }

    return reservation;
  }

  // TODO: To be improved
  public async cancelReservation(id: Reservation['id']) {
    let reservation: Reservation | null = null;
    const oldReservation = await this.getReservationById(id);
    const visits = await this.getVisits(id);

    if (!oldReservation || !visits) {
      return reservation;
    }

    const { frequency } = oldReservation;

    const newVisits = cancelVisits(visits, frequency);

    try {
      reservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: Status.TO_BE_CANCELLED,
          visits: {
            updateMany: {
              where: { reservationId: id },
              data: newVisits
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }

    return reservation;
  }

  public async changeStatus(id: Reservation['id'], newStatus: Status) {
    let reservation: Reservation | null = null;
    const visits = await this.getVisits(id);

    if (!visits) {
      return reservation;
    }

    const newReservations = changeMultipleVisitsStatus(visits, newStatus);

    try {
      reservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: newStatus,
          visits: {
            updateMany: {
              where: { reservationId: id },
              data: newReservations
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }

    return reservation;
  }

  public async autoCloseReservation(id: Reservation['id']) {
    let reservationToClose: Reservation | null = null;

    const reservations = await this.getVisits(id);

    if (!reservations) {
      return reservationToClose;
    }

    const finishedReservations = reservations.filter(
      (reservation) =>
        reservation.status === Status.CANCELLED ||
        reservation.status === Status.CLOSED
    );

    if (finishedReservations.length === reservations.length) {
      try {
        reservationToClose = await prisma.reservation.update({
          where: { id },
          data: {
            status: Status.CLOSED
          }
        });
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
      }
    }

    return reservationToClose;
  }

  // the most important function in the project
  // TODO: After other services will be defined properly
  // public async checkAvailability()
}
