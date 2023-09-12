import type { Request, Response } from 'express';
import type { RequireAtLeastOne } from 'type-fest';

import { ReservationService } from '~/services';

import AbstractController from './AbstractController';

export default class ReservationController extends AbstractController {
  private reservationService = new ReservationService();

  constructor() {
    super('/reservations');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllReservations); // is this needed somewhere?
    this.router.post('/', this.createReservation);
    this.router.get('/:id', this.getReservationById);
    this.router.put('/:id', this.changeReservationData);
    this.router.delete('/:id', this.deleteReservation);
    this.router.post('/:id/confirm', this.confirmReservationCreation);
    this.router.put('/:id.confirm', this.confirmReservationChange);
    this.router.delete('/:id/confirm', this.confirmReservationDeletion);
  }

  private getAllReservations = (req: Request, res: Response) => {
    /** TODO */
  };

  private getReservationById = (req: Request, res: Response) => {
    /** TODO */
  };

  private createReservation = (req: Request, res: Response) => {
    /** TODO */
  };

  private changeReservationData = (req: Request, res: Response) => {
    /** TODO */
  };

  private deleteReservation = (req: Request, res: Response) => {
    /** TODO */
  };

  private confirmReservationCreation = (req: Request, res: Response) => {
    /** TODO */
  };

  private confirmReservationChange = (req: Request, res: Response) => {
    /** TODO */
  };

  private confirmReservationDeletion = (req: Request, res: Response) => {
    /** TODO */
  };
}
