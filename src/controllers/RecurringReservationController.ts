import { Reservation } from '@prisma/client';
import type { Request, Response } from 'express';

import { RecurringReservationService } from '~/services';

import AbstractController from './AbstractController';
import { TypedRequest } from '~/types';

export default class ReservationController extends AbstractController {
  private readonly recurringReservationService =
    new RecurringReservationService();

  constructor() {
    super('/recurring-reservations');
    this.createRouters();
  }

  public createRouters() {
    // this.router.get('/', this.getAllReservations); // is this needed somewhere?
    // this.router.post('/', this.createReservation);
    // this.router.get('/:id', this.getReservationById);
    // this.router.put('/:id', this.changeReservationData);
    // this.router.delete('/:id', this.deleteReservation);
    // this.router.put('/:id/confirm', this.confirmReservationDataChange);
  }

  // private getAllReservations = async (req: Request, res: Response) => {};

  // private getReservationById = async (req: Request, res: Response) => {};

  // private createReservation = async (
  //   req: Request<Omit<Reservation, 'id'>>,
  //   res: Response
  // ) => {};

  // private changeReservationData = async (
  //   req: TypedRequest<{ id: string }, { data: Omit<Reservation, 'id'> }>,
  //   res: Response
  // ) => {};

  // private deleteReservation = async (req: Request, res: Response) => {};

  // // this should be protected
  // private confirmReservationDataChange = async (
  //   req: Request,
  //   res: Response
  // ) => {};
}
