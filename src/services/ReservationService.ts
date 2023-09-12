import type { Reservation } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

export default class ReservationService {
  public getAllReservations = () => {
    /** TODO */
  };

  public getReservationById = (id: Reservation['id']) => {
    /** TODO */
  };

  public createReservation = (data: Omit<Reservation, 'id'>) => {
    /** TODO */
  };

  public changeReservationData = (
    data: RequireAtLeastOne<Reservation, 'id'>
  ) => {
    /** TODO */
  };

  public deleteReservation = (id: Reservation['id']) => {
    /** TODO */
  };

  public confirmReservationCreation = (id: Reservation['id']) => {
    /** TODO */
  };

  public confirmReservationChange = (id: Reservation['id']) => {
    /** TODO */
  };

  public confirmReservationDeletion = (id: Reservation['id']) => {
    /** TODO */
  };
}
