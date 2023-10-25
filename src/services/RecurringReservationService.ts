import {
  type RecurringReservation,
  type Reservation,
  Frequency,
  RecurringReservationStatus,
  ReservationStatus
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '~/db';
import {
  cancelReservations,
  changeMultipleReservationsStatus,
  changeReservationFrequency,
  changeWeekDay,
  createReservations
} from '~/utils/reservations';
import { extractWeekDayFromDate } from '~/utils/dateUtils';

import type { RecurringReservationCreationData } from '~/schemas/recurringReservation';

export default class RecurringReservationService {
  public async getAllRecurringReservations() {
    let recurringReservations: RecurringReservation[] | null = null;

    try {
      recurringReservations = await prisma.recurringReservation.findMany({
        include: {
          reservations: true
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservations;
  }

  public async getRecurringReservationById(id: RecurringReservation['id']) {
    let recurringReservation: RecurringReservation | null = null;

    try {
      recurringReservation = await prisma.recurringReservation.findUnique({
        where: { id },
        include: {
          reservations: true
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservation;
  }

  public async getReservations(id: RecurringReservation['id']) {
    let reservations: Reservation[] | null = [];

    try {
      reservations = await prisma.reservation.findMany({
        where: { recurringReservationId: id }
      });
    } catch (err) {
      console.error(err);
    }

    return reservations;
  }

  public async createRecurringReservation(
    data: RecurringReservationCreationData
  ) {
    const reservationGroupName = `reservationGroup-${uuidv4()}`;
    let recurringReservation: RecurringReservation | null = null;

    const reservations = createReservations(
      data,
      reservationGroupName // TODO: it can be changed to normal id later because right now, the name will be too long
    );

    const {
      clientId,
      endDate,
      frequency,
      address,
      bookerFirstName,
      bookerLastName
    } = data;

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

      recurringReservation = await prisma.recurringReservation.create({
        data: {
          clientId,
          status: RecurringReservationStatus.TO_BE_CONFIRMED,
          weekDay: extractWeekDayFromDate(endDate),
          reservations: {
            createMany: {
              data: reservations
            }
          },
          name: reservationGroupName,
          frequency,
          endDate,
          addressId,
          bookerFirstName,
          bookerLastName
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservation;
  }

  // TODO: To be improved
  public async changeFrequency(
    data: Pick<RecurringReservation, 'id' | 'frequency'>
  ) {
    const { id, frequency } = data;
    let recurringReservation: RecurringReservation | null = null;

    const reservations = await this.getReservations(id);

    const oldRecurringReservation = await this.getRecurringReservationById(id);

    if (!reservations || !oldRecurringReservation) {
      return recurringReservation;
    }

    const { frequency: oldFrequency } = oldRecurringReservation;

    if (
      oldFrequency !== frequency &&
      oldFrequency !== Frequency.ONCE &&
      frequency !== Frequency.ONCE
    ) {
      const newReservations = changeReservationFrequency(
        reservations,
        frequency,
        oldRecurringReservation.name
      );

      try {
        recurringReservation = await prisma.recurringReservation.update({
          where: { id },
          data: {
            frequency,
            status: RecurringReservationStatus.TO_BE_CONFIRMED,
            reservations: {
              createMany: {
                // updateMany may not work because that function updates already existing records only
                // recommendation - create new reservations based on new ones
                // and after confirmation remove old ones
                data: newReservations.map((reservation) => ({
                  name: reservation.name,
                  startDate: reservation.startDate,
                  endDate: reservation.endDate,
                  includeDetergents: reservation.includeDetergents,
                  cost: reservation.cost,
                  status: reservation.status
                }))
              }
            }
          }
        });
      } catch (err) {
        console.error(err);
      }
    }

    return recurringReservation;
  }

  // TODO: To be improved
  public async changeWeekDay(
    data: Pick<RecurringReservation, 'id' | 'weekDay' | 'frequency'>
  ) {
    const { id, weekDay, frequency } = data;
    let recurringReservation: RecurringReservation | null = null;

    const reservations = await this.getReservations(id);

    if (!reservations) {
      return recurringReservation;
    }

    const newReservations = changeWeekDay(reservations, weekDay, frequency);

    try {
      recurringReservation = await prisma.recurringReservation.update({
        where: { id },
        data: {
          status: RecurringReservationStatus.TO_BE_CONFIRMED,
          reservations: {
            updateMany: {
              where: { recurringReservationId: id },
              data: newReservations
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservation;
  }

  // TODO: To be improved
  public async cancelReservation(id: RecurringReservation['id']) {
    let recurringReservation: RecurringReservation | null = null;
    const oldRecurringReservation = await this.getRecurringReservationById(id);
    const reservations = await this.getReservations(id);

    if (!oldRecurringReservation || !reservations) {
      return recurringReservation;
    }

    const { frequency } = oldRecurringReservation;

    const newReservations = cancelReservations(reservations, frequency);

    try {
      recurringReservation = await prisma.recurringReservation.update({
        where: { id },
        data: {
          status: RecurringReservationStatus.TO_BE_CANCELLED,
          reservations: {
            updateMany: {
              where: { recurringReservationId: id },
              data: newReservations
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservation;
  }

  public async changeReservationStatus(
    id: RecurringReservation['id'],
    newRecurringReservationStatus: RecurringReservationStatus,
    newReservationStatus: ReservationStatus
  ) {
    let recurringReservation: RecurringReservation | null = null;
    const reservations = await this.getReservations(id);

    if (!reservations) {
      return recurringReservation;
    }

    const newReservations = changeMultipleReservationsStatus(
      reservations,
      newReservationStatus
    );

    try {
      recurringReservation = await prisma.recurringReservation.update({
        where: { id },
        data: {
          status: newRecurringReservationStatus,
          reservations: {
            updateMany: {
              where: { recurringReservationId: id },
              data: newReservations
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservation;
  }

  public async autoCloseRecurringReservation(id: Reservation['id']) {
    let reservationToClose: RecurringReservation | null = null;

    const reservations = await this.getReservations(id);

    if (!reservations) {
      return reservationToClose;
    }

    const finishedReservations = reservations.filter(
      (reservation) =>
        reservation.status === ReservationStatus.CANCELLED ||
        reservation.status === ReservationStatus.CLOSED
    );

    if (finishedReservations.length === reservations.length) {
      try {
        reservationToClose = await prisma.recurringReservation.update({
          where: { id },
          data: {
            status: RecurringReservationStatus.CLOSED
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
