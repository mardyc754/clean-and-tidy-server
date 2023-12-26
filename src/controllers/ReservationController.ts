import type { Request, Response } from 'express';
import { Stringified } from 'type-fest';

import { EmployeeIdData } from '~/schemas/employee';
import {
  ReservationCreationData,
  StatusChangeData
} from '~/schemas/reservation';

import { checkIsEmployee } from '~/middlewares/auth/checkRole';
import { validateEmployeeId } from '~/middlewares/type-validators/employee';
import {
  validateReservationCreationData,
  validateStatusChange
} from '~/middlewares/type-validators/reservation';

import { ReservationService } from '~/services';

import type { ReservationQueryOptions } from '~/services/ReservationService';

import { queryParamToBoolean } from '~/utils/general';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

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
      validateReservationCreationData(),
      this.createReservation
    );
    this.router.get('/:name', this.getReservationByName);
    this.router.get('/:id/visits', this.getVisits);
    this.router.put('/:id/status', validateStatusChange(), this.changeStatus);
    this.router.put(
      '/:name/confirm',
      checkIsEmployee(),
      validateEmployeeId(),
      this.confirmReservation
    );
  }

  private getAllReservations = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<ReservationQueryOptions>
    >,
    res: Response
  ) => {
    const reservations = await this.reservationService.getAllReservations();

    if (reservations !== null) {
      res.status(200).send(reservations);
    } else {
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
    const reservation = await this.reservationService.getReservationByName(
      req.params.name,
      {
        includeVisits: queryParamToBoolean(req.query.includeVisits),
        includeServices: queryParamToBoolean(req.query.includeServices),
        includeAddress: queryParamToBoolean(req.query.includeAddress)
      }
    );

    if (reservation !== null) {
      res.status(200).send(reservation);
    } else {
      res.status(404).send({
        message: `Reservation with name=${req.params.name} not found`,
        hasError: true
      });
    }
  };

  private getVisits = async (req: Request<{ id: string }>, res: Response) => {
    const reservations = await this.reservationService.getVisits(req.params.id);

    if (reservations !== null) {
      res.status(200).send({
        data: reservations
      });
    } else {
      res.status(404).send({
        message: `Reservation with id=${req.params.id} not found`
      });
    }
  };

  private createReservation = async (
    req: TypedRequest<DefaultParamsType, ReservationCreationData>,
    res: Response
  ) => {
    const reservation = await this.reservationService.createReservation(
      req.body
    );

    if (reservation) {
      res.status(201).send(reservation);
    } else {
      res.status(400).send({
        message: 'Error when creating reservation',
        hasError: true
      });
    }
  };

  private changeStatus = async (
    req: TypedRequest<{ id: string }, StatusChangeData>,
    res: Response
  ) => {
    const { status, employeeId } = req.body;

    const reservation = await this.reservationService.changeStatus(
      parseInt(req.params.id),
      employeeId,
      status
    );

    if (reservation !== null) {
      res.status(200).send(reservation);
    } else {
      res.status(404).send({
        message: `Reservation with id=${req.params.id} not found`
      });
    }
  };

  private confirmReservation = async (
    req: TypedRequest<{ name: string }, EmployeeIdData>,
    res: Response
  ) => {
    const { employeeId } = req.body;

    const reservation = await this.reservationService.confirmReservation(
      req.params.name,
      employeeId
    );

    if (reservation !== null) {
      res.status(200).send(reservation);
    } else {
      res.status(404).send({
        message: `Reservation with name=${req.params.name} not found`
      });
    }
  };
}
