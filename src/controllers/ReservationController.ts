import { Reservation } from '@prisma/client';
import type { Response } from 'express';
import { Stringified } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import { EmployeeIdData } from '~/schemas/employee';
import { ReservationCreationData } from '~/schemas/reservation';

import { checkIsEmployee } from '~/middlewares/auth/checkAuthorization';
import { validateEmployeeId } from '~/middlewares/type-validators/employee';
import { validateReservationCreationData } from '~/middlewares/type-validators/reservation';

import { ReservationService } from '~/services';

import type { ReservationQueryOptions } from '~/services/ReservationService';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class ReservationController extends AbstractController {
  private readonly reservationService = new ReservationService();

  constructor() {
    super('/reservations');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllReservations);
    this.router.post(
      '/',
      validateReservationCreationData(),
      this.createReservation
    );
    this.router.get('/:name', this.getReservationByName);
    this.router.put(
      '/:name/confirm',
      checkIsEmployee(),
      validateEmployeeId(),
      this.confirmReservation
    );
    this.router.put('/:name/cancel', this.cancelReservation);
  }

  private getAllReservations = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<ReservationQueryOptions>
    >,
    res: Response
  ) => {
    try {
      const reservations = await this.reservationService.getAllReservations();

      res.status(200).send(reservations);
    } catch (err) {
      res
        .status(400)
        .send({ message: 'Error when receiving all reservations' });
    }
  };

  private getReservationByName = async (
    req: TypedRequest<
      { name: string },
      DefaultBodyType,
      Stringified<ReservationQueryOptions>
    >,
    res: Response
  ) => {
    try {
      const reservation = await this.reservationService.getReservationByName(
        req.params.name
      );

      if (!reservation) {
        return res.status(404).send({
          message: `Reservation with name=${req.params.name} not found`
        });
      }

      return res.status(200).send(reservation);
    } catch (err) {
      res.status(400).send({
        message: `Error when creating reservation with name=${req.params.name}`
      });
    }
  };

  private createReservation = async (
    req: TypedRequest<DefaultParamsType, ReservationCreationData>,
    res: Response
  ) => {
    try {
      const reservation = await this.reservationService.createReservation(
        req.body
      );

      res.status(201).send(reservation);
    } catch (err) {
      if (err instanceof RequestError) {
        return res.status(400).send({
          message: err.message
        });
      }
      res.status(400).send({
        message: 'Error when creating reservation'
      });
    }
  };

  private confirmReservation = async (
    req: TypedRequest<{ name: string }, EmployeeIdData>,
    res: Response
  ) => {
    const { employeeId } = req.body;

    try {
      const reservation = await this.reservationService.confirmReservation(
        req.params.name,
        employeeId
      );
      return res.status(200).send(reservation);
    } catch (err) {
      return res.status(400).send({
        message: `Error on confirm reservation name=${req.params.name}`
      });
    }
  };

  private cancelReservation = async (
    req: TypedRequest<{ name: Reservation['name'] }>,
    res: Response
  ) => {
    try {
      const reservation = await this.reservationService.cancelReservation(
        req.params.name
      );
      res.status(200).send(reservation);
    } catch (err) {
      res.status(400).send({
        message: `Error when cancelling reservation with name=${req.params.name}`
      });
    }
  };
}
