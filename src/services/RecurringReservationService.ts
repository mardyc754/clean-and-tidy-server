import {
  type RecurringReservation,
  type Reservation,
  CleaningFrequency,
  RecurringReservationStatus,
  ReservationStatus
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { dayjs } from '~/lib';
import { prisma } from '~/db';
import {
  cancelReservations,
  changeReservationFrequency,
  changeWeekDay,
  confirmReservations,
  confirmReservationsCancelation,
  createReservations
} from '~/utils/reservations';

import type { RecurringReservationCreationData } from '~/types';

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

  public async getReservationsFromRecurringReservation(
    id: RecurringReservation['id']
  ) {
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

    try {
      recurringReservation = await prisma.recurringReservation.create({
        data: {
          ...data,
          status: RecurringReservationStatus.TO_BE_CONFIRMED,
          // weekDay: extractWeekDayFromDate(data.endDate),
          weekDay: dayjs(data.endDate).day(),
          reservations: {
            createMany: {
              data: reservations
            }
          },
          name: reservationGroupName
        }
      });
    } catch (err) {
      console.error(err);
    }

    return recurringReservation;
  }

  public async changeFrequency(
    data: Pick<RecurringReservation, 'id' | 'frequency'>
  ) {
    const { id, frequency } = data;
    let recurringReservation: RecurringReservation | null = null;

    const reservations = await this.getReservationsFromRecurringReservation(id);

    const oldRecurringReservation = await this.getRecurringReservationById(id);

    if (!reservations || !oldRecurringReservation) {
      return recurringReservation;
    }

    const { frequency: oldFrequency } = oldRecurringReservation;

    if (
      oldFrequency !== frequency &&
      oldFrequency !== CleaningFrequency.ONCE &&
      frequency !== CleaningFrequency.ONCE
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
                data: newReservations
              }
            }
          }
        });
      } catch (err) {
        console.log(err);
      }
    }

    return recurringReservation;
  }

  public async changeWeekDay(
    data: Pick<RecurringReservation, 'id' | 'weekDay' | 'frequency'>
  ) {
    const { id, weekDay, frequency } = data;
    let recurringReservation: RecurringReservation | null = null;

    const reservations = await this.getReservationsFromRecurringReservation(id);

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
      console.log(err);
    }

    return recurringReservation;
  }

  public async cancelReservation(id: RecurringReservation['id']) {
    let recurringReservation: RecurringReservation | null = null;
    const oldRecurringReservation = await this.getRecurringReservationById(id);
    const reservations = await this.getReservationsFromRecurringReservation(id);

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
      console.log(err);
    }

    return recurringReservation;
  }

  public async confirmReservationDataChange(id: RecurringReservation['id']) {
    let recurringReservation: RecurringReservation | null = null;
    const reservations = await this.getReservationsFromRecurringReservation(id);

    if (!reservations) {
      return recurringReservation;
    }

    const newReservations = confirmReservations(reservations);

    try {
      recurringReservation = await prisma.recurringReservation.update({
        where: { id },
        data: {
          status: RecurringReservationStatus.ACTIVE,
          reservations: {
            updateMany: {
              where: { recurringReservationId: id },
              data: newReservations
            }
          }
        }
      });
    } catch (err) {
      console.log(err);
    }

    return recurringReservation;
  }

  public async confirmReservationCancelation(id: RecurringReservation['id']) {
    let recurringReservation: RecurringReservation | null = null;
    const reservations = await this.getReservationsFromRecurringReservation(id);

    if (!reservations) {
      return recurringReservation;
    }

    const newReservations = confirmReservationsCancelation(reservations);

    try {
      recurringReservation = await prisma.recurringReservation.update({
        where: { id },
        data: {
          status: RecurringReservationStatus.CANCELLED,
          reservations: {
            updateMany: {
              where: { recurringReservationId: id },
              data: newReservations
            }
          }
        }
      });
    } catch (err) {
      console.log(err);
    }

    return recurringReservation;
  }

  public async closeRecurringReservation(id: Reservation['id']) {
    let reservationToClose: RecurringReservation | null = null;

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

    return reservationToClose;
  }

  public async autoCloseRecurringReservation(id: Reservation['id']) {
    let reservationToClose: RecurringReservation | null = null;

    const reservations = await this.getReservationsFromRecurringReservation(id);

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
