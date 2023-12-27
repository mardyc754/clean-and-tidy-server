import { Reservation, Status } from '@prisma/client';
import type { Request, Response } from 'express';
import { Stringified } from 'type-fest';

import { EmployeeIdData } from '~/schemas/employee';
import { ReservationCreationData } from '~/schemas/reservation';

import { checkIsEmployee } from '~/middlewares/auth/checkRole';
import { validateEmployeeId } from '~/middlewares/type-validators/employee';
import { validateReservationCreationData } from '~/middlewares/type-validators/reservation';

import { ReservationService, VisitPartService } from '~/services';

import type { ReservationQueryOptions } from '~/services/ReservationService';

import { Scheduler } from '~/utils/Scheduler';
import { isAfter, isAfterOrSame } from '~/utils/dateUtils';
import { queryParamToBoolean } from '~/utils/general';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class ReservationController extends AbstractController {
  private readonly reservationService = new ReservationService();
  private readonly visitPartService = new VisitPartService();
  private readonly scheduler = Scheduler.getInstance();

  constructor() {
    super('/reservations');
    this.createRouters();

    (async () => {
      const reservations = await this.reservationService.getAllReservations(
        Status.ACTIVE
      );

      const reservationVisitParts =
        await this.visitPartService.getVisitPartsFromReservations(
          reservations?.map((reservation) => reservation.id) ?? [],
          Status.ACTIVE
        );

      if (!reservationVisitParts || reservationVisitParts.length === 0) {
        return;
      }

      // close past visit parts if there are any
      const pastVisitParts = reservationVisitParts.filter((visitPart) =>
        isAfterOrSame(new Date(), visitPart.endDate)
      );

      if (pastVisitParts.length > 0) {
        await this.visitPartService.closeVisitParts(
          pastVisitParts.map((visitPart) => visitPart.id)
        );
      }

      const futureVisitParts = reservationVisitParts.filter((visitPart) =>
        isAfter(visitPart.endDate, new Date())
      );

      futureVisitParts.forEach(async (visitPart) => {
        this.scheduler.scheduleVisitPartJob(visitPart, () =>
          this.visitPartService.closeVisitPart(visitPart.id)
        );
      });

      // close past reservations if there are any
      const pastReservations = reservations?.filter((reservation) => {
        const reservationEndDate = Math.max(
          ...reservation.visits
            .flatMap((visit) => visit.visitParts)
            .map((visitPart) => new Date(visitPart.endDate).getTime())
        );

        return isAfterOrSame(new Date(), new Date(reservationEndDate));
      });

      if ((pastReservations?.length ?? 0) > 0) {
        await this.reservationService.closeReservations(
          pastReservations?.map((reservation) => reservation.id) ?? []
        );
      }

      const futureReservations = reservations?.filter((reservation) => {
        const reservationEndDate = Math.max(
          ...reservation.visits
            .flatMap((visit) => visit.visitParts)
            .map((visitPart) => new Date(visitPart.endDate).getTime())
        );

        return isAfter(new Date(reservationEndDate), new Date());
      });

      futureReservations?.forEach(async (reservation) => {
        const reservationEndDate =
          reservationVisitParts[reservationVisitParts.length - 1]!.endDate;

        this.scheduler.scheduleReservationJob(
          reservation,
          new Date(reservationEndDate),
          () => this.reservationService.closeReservation(reservation.id)
        );
      });
    })();
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

    this.router.put(
      '/:name/confirm',
      checkIsEmployee(),
      validateEmployeeId(),
      this.confirmReservation
    );

    this.router.put('/:name/calcel', this.cancelReservation);
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
      const reservationVisitParts =
        await this.visitPartService.getVisitPartsByReservationId(
          reservation.id
        );

      if (!reservationVisitParts || reservationVisitParts.length === 0) {
        return res.status(400).send({
          message: 'Error when creating reservation',
          hasError: true
        });
      }
      reservationVisitParts.forEach((visitPart) => {
        this.scheduler.scheduleVisitPartJob(visitPart, () =>
          this.visitPartService.closeVisitPart(visitPart.id)
        );
      });

      this.scheduler.scheduleReservationJob(
        reservation,
        new Date(
          reservationVisitParts[reservationVisitParts.length - 1]!.endDate
        ),
        () => this.reservationService.closeReservation(reservation.id)
      );

      res.status(200).send(reservation);
    } else {
      res.status(404).send({
        message: `Reservation with name=${req.params.name} not found`
      });
    }
  };

  private cancelReservation = async (
    req: TypedRequest<{ name: Reservation['name'] }>,
    res: Response
  ) => {
    const reservation = await this.reservationService.cancelReservation(
      req.params.name
    );

    if (reservation !== null) {
      const reservationVisitParts =
        await this.visitPartService.getVisitPartsByReservationId(
          reservation.id,
          Status.CANCELLED
        );

      if (!reservationVisitParts || reservationVisitParts.length === 0) {
        return res.status(400).send({
          message: 'Error when creating reservation',
          hasError: true
        });
      }

      this.scheduler.cancelReservationJob(reservation.id);
      reservationVisitParts.forEach((visitPart) => {
        this.scheduler.cancelVisitPartJob(visitPart.id);
      });

      res.status(200).send(reservation);
    } else {
      res.status(404).send({
        message: `Reservation with name=${req.params.name} not found`
      });
    }
  };
}
