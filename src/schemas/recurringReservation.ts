import {
  Frequency,
  RecurringReservationStatus,
  ReservationStatus
} from '@prisma/client';
import { z } from 'zod';
import { reservationCreationDataSchema } from './reservation';

const FrequencySchema = z.nativeEnum(Frequency);

export const recurringReservationCreationSchema = z.object({
  frequency: FrequencySchema,
  clientId: z.number().int(), // it can be an client email as well
  endDate: z.string().datetime(),
  reservationData: reservationCreationDataSchema,
  address: z
    .object({
      street: z.string().max(40),
      houseNumber: z.string().max(6),
      postCode: z.string().length(6),
      city: z.string().max(40)
    })
    .or(z.number().int())
});

export type RecurringReservationCreationData = z.infer<
  typeof recurringReservationCreationSchema
>;

export const FrequencyChangeSchema = z.object({
  frequency: FrequencySchema
});

export type FrequencyChangeData = z.infer<typeof FrequencyChangeSchema>;

export const weekDaySchema = z
  .object({
    weekDay: z.number().min(0).max(6)
  })
  .merge(FrequencyChangeSchema);

export type WeekDayChangeData = z.infer<typeof weekDaySchema>;

export const recurringReservationStatusChangeSchema = z.object({
  recurringReservationStatus: z.nativeEnum(RecurringReservationStatus),
  reservationStatus: z.nativeEnum(ReservationStatus)
});

export type RecurringReservationStatusChangeData = z.infer<
  typeof recurringReservationStatusChangeSchema
>;
