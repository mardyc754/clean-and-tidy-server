import type { Request, Response } from 'express';
import { Stringified } from 'type-fest';

import { ReservationService } from '~/services';
import type { ReservationQueryOptions } from '~/services/ReservationService';

import {
  FrequencyChangeData,
  ReservationCreationData,
  StatusChangeData,
  WeekDayChangeData
} from '~/schemas/reservation';
import {
  // validateFrequency,
  // validateWeekDay,
  validateReservationCreationData,
  validateStatusChange
} from '~/middlewares/type-validators/reservation';
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
    // this.router.get('/:id', this.getReservationById);
    this.router.get('/:name', this.getReservationByName);

    this.router.get('/:id/visits', this.getVisits);
    // TODO: The methods below needs to be improved
    // this.router.put(
    //   '/:id/frequency',
    //   validateFrequency(),
    //   this.changeFrequency
    // );
    // this.router.put('/:id/weekDay', validateWeekDay(), this.changeWeekDay);
    this.router.put('/:id/status', validateStatusChange(), this.changeStatus);
  }

  private getAllReservations = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<ReservationQueryOptions>
    >,
    res: Response
  ) => {
    const reservations = await this.reservationService.getAllReservations({
      includeVisits: queryParamToBoolean(req.query.includeVisits)
    });

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
    req: TypedRequest<
      { id: string },
      DefaultBodyType,
      { includeVisits?: string }
    >,
    res: Response
  ) => {
    const reservation = await this.reservationService.getReservationById(
      parseInt(req.params.id),
      {
        includeVisits: queryParamToBoolean(req.query.includeVisits)
      }
    );

    if (reservation !== null) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
      });
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
      res.status(200).send({
        ...reservation
      });
    } else {
      res.status(404).send({
        message: `Reservation with name=${req.params.name} not found`,
        hasError: true
      });
    }
  };

  private getVisits = async (req: Request<{ id: string }>, res: Response) => {
    const reservations = await this.reservationService.getVisits(
      parseInt(req.params.id)
    );

    if (reservations !== null) {
      res.status(200).send({
        data: reservations
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
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

  private changeFrequency = async (
    req: TypedRequest<{ id: string }, FrequencyChangeData>,
    res: Response
  ) => {
    const reservation = this.reservationService.changeFrequency({
      id: parseInt(req.params.id),
      frequency: req.body.frequency
    });

    if (reservation) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
      });
    }
  };

  private changeWeekDay = async (
    req: TypedRequest<{ id: string }, WeekDayChangeData>,
    res: Response
  ) => {
    const reservation = this.reservationService.changeWeekDay({
      id: parseInt(req.params.id),
      weekDay: req.body.weekDay,
      frequency: req.body.frequency
    });

    if (reservation) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
      });
    }
  };

  private changeStatus = async (
    req: TypedRequest<{ id: string }, StatusChangeData>,
    res: Response
  ) => {
    const { status } = req.body;

    const reservation = await this.reservationService.changeStatus(
      parseInt(req.params.id),
      status
    );

    if (reservation !== null) {
      res.status(200).send({
        data: reservation
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
      });
    }
  };

  // private getReservationAvailability = async (
  //   req: TypedRequest<{ id: string }, { data: Omit<Reservation, 'id'> }>,
  //   res: Response
  // ) => {};

  // private deleteReservation = async (req: Request, res: Response) => {};
}
