import type { Query } from 'express-serve-static-core';
import type { Request } from 'express';
import type { Reservation, RecurringReservation } from '@prisma/client';

export interface TypedRequest<T extends Query, U> extends Request {
  body: U;
  query: T;
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
