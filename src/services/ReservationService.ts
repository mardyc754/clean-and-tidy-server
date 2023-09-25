import { ReservationStatus, type Reservation } from '@prisma/client';

import { prisma } from '~/db';
import {
  ChangeReservationDateData,
  SingleReservationCreationData
} from '~/schemas/reservation';
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

  public async createReservation(data: SingleReservationCreationData) {
    let reservation: Reservation | null = null;

    try {
      reservation = await prisma.reservation.create({
        data: {
          ...data,
          name: `${data.recurringReservationId}`, // reservation name should contain the reservation number
          status: ReservationStatus.TO_BE_CONFIRMED
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return reservation;
  }

  public async changeReservationDate(data: ChangeReservationDateData) {
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

  public async changeReservationStatus(
    id: Reservation['id'],
    newStatus: Reservation['status']
  ) {
    let updatedReservation: Reservation | null = null;

    try {
      updatedReservation = await prisma.reservation.update({
        where: { id },
        data: { status: newStatus }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return updatedReservation;
  }

  public async autoCloseReservation(data: Pick<Reservation, 'id' | 'endDate'>) {
    let reservationToClose: Reservation | null = null;

    const { id, endDate } = data;

    if (now().isAfter(endDate)) {
      reservationToClose = await this.changeReservationStatus(
        id,
        ReservationStatus.CLOSED
      );
    }

    return reservationToClose;
  }
}
