import type { Request, Response } from 'express';

import { ReservationService } from '~/services';

import AbstractController from './AbstractController';
import { DefaultParamsType, TypedRequest } from '~/types';
import {
  ChangeReservationDateData,
  ChangeReservationStatusData,
  SingleReservationCreationData
} from '~/schemas/reservation';
import {
  validateReservationDate,
  validateReservationStatus,
  validateSingleReservationCreationData
} from '~/middlewares/type-validators/reservation';

export default class ReservationController extends AbstractController {
  private readonly reservationService = new ReservationService();

  constructor() {
    super('/reservations');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllReservations); // is this needed somewhere?
    this.router.post(
      '/',
      validateSingleReservationCreationData(),
      this.createReservation
    );
    this.router.get('/:id', this.getReservationById);
    this.router.put(
      '/:id',
      validateReservationDate(),
      this.changeReservationDate
    );
    this.router.delete('/:id', this.deleteReservation);
    this.router.put(
      '/:id/status',
      validateReservationStatus(),
      this.changeReservationStatus
    );
  }

  private getAllReservations = async (_: Request, res: Response) => {
    const reservations = await this.reservationService.getAllReservations();

    if (reservations !== null) {
      res.status(200).send({
        data: reservations
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when receiving all reservations' });
    }
  };

  private getReservationById = async (
    req: Request<{ id: string }>,
    res: Response
  ) => {
    const reservation = await this.reservationService.getReservationById(
      parseInt(req.params.id)
    );

    if (reservation) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(404).send({ message: 'Reservation not found' });
    }
  };

  private createReservation = async (
    req: TypedRequest<DefaultParamsType, SingleReservationCreationData>,
    res: Response
  ) => {
    const data = req.body;

    const reservation = await this.reservationService.createReservation(data);

    if (reservation) {
      res.status(201).send({
        data: reservation
      });
    } else {
      res.status(400).send({ message: 'Error when creating the reservation' });
    }
  };

  private changeReservationDate = async (
    req: TypedRequest<{ id: string }, ChangeReservationDateData>,
    res: Response
  ) => {
    const reservation = await this.reservationService.changeReservationDate({
      ...req.body,
      id: parseInt(req.params.id)
    });

    if (reservation) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(400).send({ message: 'Error when updating reservation data' });
    }
  };

  private deleteReservation = async (
    req: Request<{ id: string }>,
    res: Response
  ) => {
    const reservation = await this.reservationService.deleteReservation(
      parseInt(req.params.id)
    );

    if (reservation) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(400).send({ message: 'Error when deleting the reservation' });
    }
  };

  // this should be protected
  private changeReservationStatus = async (
    req: TypedRequest<{ id: string }, ChangeReservationStatusData>,
    res: Response
  ) => {
    const reservation = await this.reservationService.changeReservationStatus(
      parseInt(req.params.id),
      req.body.status
    );

    if (reservation) {
      res.status(200).send({
        ...reservation
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when confirm reservation change' });
    }
  };
}
