import { ReservationStatus, type Reservation } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';
import { areStartEndDateValid, now } from '~/utils/dateUtils';

export default class ReservationService {
  public async getAllReservations() {
    let reservations: Reservation[] | null = null;

    try {
      reservations = await prisma.reservation.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return reservations;
  }

  public async getReservationById(id: Reservation['id']) {
    let reservation: Reservation | null = null;

    try {
      reservation = await prisma.reservation.findFirst({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return reservation;
  }

  public async createReservation(data: Omit<Reservation, 'id' | 'status'>) {
    let reservation: Reservation | null = null;

    try {
      reservation = await prisma.reservation.create({
        data: { ...data, status: ReservationStatus.TO_BE_CONFIRMED }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return reservation;
  }

  /**
   * Change anything in reservation that is not a start or end date
   * @param data new reservation data
   * @returns reservation object with changed data if reservation was changed successfully, null otherwise
   */
  public async changeReservationData(
    data: RequireAtLeastOne<
      Omit<Reservation, 'status' | 'startDate' | 'endDate'>,
      'id'
    >
  ) {
    const { id, ...rest } = data;
    let updatedReservation: Reservation | null = null;

    try {
      updatedReservation = await prisma.reservation.update({
        where: { id },
        data: {
          ...rest,
          status: ReservationStatus.TO_BE_CONFIRMED
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return updatedReservation;
  }

  public async changeReservationDate(
    data: Pick<Reservation, 'id' | 'startDate' | 'endDate'>
  ) {
    const { id, startDate, endDate } = data;

    const oldReservationData = await this.getReservationById(id);

    if (!oldReservationData) {
      return null;
    }

    const { startDate: oldStartDate, endDate: oldEndDate } = oldReservationData;

    let updatedReservation: Reservation | null = null;

    if (areStartEndDateValid(startDate, endDate, oldStartDate, oldEndDate)) {
      try {
        updatedReservation = await prisma.reservation.update({
          where: { id },
          data: {
            startDate,
            endDate,
            status: ReservationStatus.TO_BE_CONFIRMED
          }
        });
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
      }
    }

    return updatedReservation;
  }

  public async cancelReservation(id: Reservation['id']) {
    let cancelledReservation: Reservation | null = null;

    try {
      cancelledReservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.TO_BE_CANCELLED
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return cancelledReservation;
  }

  public async deleteReservation(id: Reservation['id']) {
    let deletedReservation: Reservation | null = null;

    try {
      deletedReservation = await prisma.reservation.delete({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return deletedReservation;
  }

  public async confirmReservationDataChange(id: Reservation['id']) {
    let updatedReservation: Reservation | null = null;

    try {
      updatedReservation = await prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.ACTIVE }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return updatedReservation;
  }

  public async confirmReservationCancelation(id: Reservation['id']) {
    let cancelledReservation: Reservation | null = null;

    try {
      cancelledReservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return cancelledReservation;
  }

  public async closeReservation(id: Reservation['id']) {
    let reservationToClose: Reservation | null = null;

    try {
      reservationToClose = await prisma.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CLOSED
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return reservationToClose;
  }

  public async autoCloseReservation(data: Pick<Reservation, 'id' | 'endDate'>) {
    let reservationToClose: Reservation | null = null;

    const { id, endDate } = data;

    if (now().isAfter(endDate)) {
      reservationToClose = await this.closeReservation(id);
    }

    return reservationToClose;
  }
}
