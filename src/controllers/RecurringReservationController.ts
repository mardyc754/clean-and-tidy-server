import type { Request, Response } from 'express';

import { RecurringReservationService } from '~/services';

import {
  CleaningFrequencyChangeData,
  RecurringReservationCreationData,
  RecurringReservationStatusChangeData,
  WeekDayChangeData
} from '~/schemas/recurringReservation';
import type { DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';
import {
  // validateCleaningFrequency,
  // validateWeekDay,
  validateRecurringReservationCreationData,
  validateStatusChange
} from '~/middlewares/type-validators/recurringReservation';

export default class ReservationController extends AbstractController {
  private readonly recurringReservationService =
    new RecurringReservationService();

  constructor() {
    super('/recurring-reservations');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllRecurringReservations); // is this needed somewhere?
    this.router.post(
      '/',
      validateRecurringReservationCreationData(),
      this.createRecurringReservation
    );
    this.router.get('/:id', this.getRecurringReservationById);
    this.router.get(
      '/:id/reservations',
      this.getReservationsFromRecurringReservation
    );
    // TODO: The methods below needs to be improved
    // this.router.put(
    //   '/:id/frequency',
    //   validateCleaningFrequency(),
    //   this.changeFrequency
    // );
    // this.router.put('/:id/weekDay', validateWeekDay(), this.changeWeekDay);
    this.router.put(
      '/:id/status',
      validateStatusChange(),
      this.changeRecurringReservationStatus
    );
  }

  private getAllRecurringReservations = async (req: Request, res: Response) => {
    const recurringReservations =
      await this.recurringReservationService.getAllRecurringReservations();

    if (recurringReservations !== null) {
      res.status(200).send({
        data: recurringReservations
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when receiving all recurring reservations' });
    }
  };

  private getRecurringReservationById = async (
    req: Request<{ id: string }>,
    res: Response
  ) => {
    const recurringReservation =
      await this.recurringReservationService.getRecurringReservationById(
        parseInt(req.params.id)
      );

    if (recurringReservation !== null) {
      res.status(200).send({
        data: recurringReservation
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
      });
    }
  };

  private getReservationsFromRecurringReservation = async (
    req: Request<{ id: string }>,
    res: Response
  ) => {
    const reservations = await this.recurringReservationService.getReservations(
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

  private createRecurringReservation = async (
    req: TypedRequest<DefaultParamsType, RecurringReservationCreationData>,
    res: Response
  ) => {
    const recurringReservation =
      await this.recurringReservationService.createRecurringReservation(
        req.body
      );

    if (recurringReservation) {
      res.status(200).send({
        data: recurringReservation
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when creating recurring reservation' });
    }
  };

  private changeFrequency = async (
    req: TypedRequest<{ id: string }, CleaningFrequencyChangeData>,
    res: Response
  ) => {
    const recurringReservation =
      this.recurringReservationService.changeFrequency({
        id: parseInt(req.params.id),
        frequency: req.body.frequency
      });

    if (recurringReservation) {
      res.status(200).send({
        data: recurringReservation
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
    const recurringReservation = this.recurringReservationService.changeWeekDay(
      {
        id: parseInt(req.params.id),
        weekDay: req.body.weekDay,
        frequency: req.body.frequency
      }
    );

    if (recurringReservation) {
      res.status(200).send({
        data: recurringReservation
      });
    } else {
      res.status(404).send({
        message: `Recurring reservation with id=${req.params.id} not found`
      });
    }
  };

  private changeRecurringReservationStatus = async (
    req: TypedRequest<{ id: string }, RecurringReservationStatusChangeData>,
    res: Response
  ) => {
    const { recurringReservationStatus, reservationStatus } = req.body;

    const recurringReservation =
      await this.recurringReservationService.changeReservationStatus(
        parseInt(req.params.id),
        recurringReservationStatus,
        reservationStatus
      );

    if (recurringReservation !== null) {
      res.status(200).send({
        data: recurringReservation
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
