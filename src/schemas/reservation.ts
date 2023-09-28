import { z } from 'zod';
import { ISOString } from './common';
import { ReservationStatus } from '@prisma/client';

export const reservationCreationDataSchema = z.object({
  endDate: ISOString,
  startDate: ISOString,
  includeDetergents: z.boolean(),
  cost: z.number()
});

export type ReservationCreationData = z.infer<
  typeof reservationCreationDataSchema
>;

export const singleReservationCreationDataSchema = z
  .object({
    recurringReservationId: z.number()
  })
  .merge(reservationCreationDataSchema);

export type SingleReservationCreationData = z.infer<
  typeof singleReservationCreationDataSchema
>;

export const changeReservationDateSchema = z.object({
  id: z.number(),
  startDate: ISOString,
  endDate: ISOString
});

export type ChangeReservationDateData = z.infer<
  typeof changeReservationDateSchema
>;

export const changeReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus)
});

export type ChangeReservationStatusData = z.infer<
  typeof changeReservationStatusSchema
>;
