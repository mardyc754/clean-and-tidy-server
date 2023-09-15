import type { Request, Response } from 'express';

import { ReservationService } from '~/services';

import AbstractController from './AbstractController';
import { Reservation } from '@prisma/client';
import { TypedRequest } from '~/types';

export default class ReservationController extends AbstractController {
  private readonly reservationService = new ReservationService();

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
    this.router.put('/:id/confirm', this.confirmReservationDataChange);
  }

  private getAllReservations = async (req: Request, res: Response) => {
    const reservations = await this.reservationService.getAllReservations();

    if (reservations !== null) {
      res.status(200).send({
        ...reservations
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when receiving all reservations' });
    }
  };

  private getReservationById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'Reservation id not provided' });
      return;
    }

    const reservation = await this.reservationService.getReservationById(id);

    if (reservation) {
      res.status(200).send({
        ...reservation
      });
    } else {
      res.status(404).send({ message: 'Reservation not found' });
    }
  };

  private createReservation = async (
    req: Request<Omit<Reservation, 'id'>>,
    res: Response
  ) => {
    const data = req.body;

    const reservation = await this.reservationService.createReservation(data);

    if (reservation) {
      res.status(201).send({
        ...reservation
      });
    } else {
      res.status(400).send({ message: 'Error when creating the reservation' });
    }
  };

  private changeReservationData = async (
    req: TypedRequest<{ id: string }, { data: Omit<Reservation, 'id'> }>,
    res: Response
  ) => {
    const { id } = req.query;
    const { data } = req.body;

    if (!id) {
      res.status(400).send({ message: 'Reservation id not provided' });
      return;
    }

    const reservation = await this.reservationService.changeReservationData({
      id,
      ...data
    });

    if (reservation) {
      res.status(200).send({
        ...reservation
      });
    } else {
      res.status(400).send({ message: 'Error when updating reservation data' });
    }
  };

  private deleteReservation = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'Reservation id not provided' });
      return;
    }

    const reservation = await this.reservationService.deleteReservation(id);

    if (reservation) {
      res.status(200).send({
        ...reservation
      });
    } else {
      res.status(400).send({ message: 'Error when deleting the reservation' });
    }
  };

  private confirmReservationDataChange = async (
    req: Request,
    res: Response
  ) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'Reservation id not provided' });
      return;
    }

    const reservation =
      await this.reservationService.confirmReservationDataChange(id);

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
