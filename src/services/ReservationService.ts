import { ReservationStatus, type Reservation } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

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

  public async changeReservationData(
    data: RequireAtLeastOne<Omit<Reservation, 'status'>, 'id'>
  ) {
    const { id, ...rest } = data;
    let updatedReservation: Reservation | null = null;

    try {
      updatedReservation = await prisma.reservation.update({
        where: { id },
        data: { ...rest, status: ReservationStatus.TO_BE_CONFIRMED }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
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
}
