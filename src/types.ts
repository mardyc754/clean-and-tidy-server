import type { Query, ParamsDictionary } from 'express-serve-static-core';
import type { Request } from 'express';
import type { Reservation, RecurringReservation } from '@prisma/client';

export type DefaultParamsType = ParamsDictionary;
export type DefaultBodyType = Record<string, unknown>;
export type DefaultQueryType = Query;

export interface TypedRequest<
  P extends ParamsDictionary = DefaultParamsType,
  U = DefaultBodyType,
  Q extends Query = DefaultQueryType
> extends Request {
  body: U;
  params: P;
  query: Q;
}

export type ReservationCreationData = Pick<
  Reservation,
  'includeDetergents' | 'cost' | 'startDate' | 'endDate'
>;

export type RecurringReservationCreationData = Pick<
  RecurringReservation,
  'frequency' | 'userId' | 'addressId' | 'employeeId' | 'endDate'
> & { reservationData: ReservationCreationData };

export type StartEndDate = {
  startDate: Date;
  endDate: Date;
};
