import type { Query, ParamsDictionary } from 'express-serve-static-core';
import type { Request } from 'express';
import type { Reservation, RecurringReservation } from '@prisma/client';

// TODO to be fixed
export interface TypedRequest<
  P extends ParamsDictionary,
  // P = Record<string, string | number>,
  U = object,
  Q extends Query = Query
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
