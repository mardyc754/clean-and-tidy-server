import {
  CleaningFrequency,
  RecurringReservationStatus,
  ReservationStatus
} from '@prisma/client';
import { z } from 'zod';
import { reservationCreationDataSchema } from './reservation';

const cleaningFrequencySchema = z.nativeEnum(CleaningFrequency);

export const recurringReservationCreationSchema = z.object({
  frequency: cleaningFrequencySchema,
  clientId: z.number().int(),
  employeeId: z.number().int(),
  endDate: z.string().datetime(),
  reservationData: reservationCreationDataSchema,
  address: z
    .object({
      areaSize: z.number(),
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

export const cleaningFrequencyChangeSchema = z.object({
  frequency: cleaningFrequencySchema
});

export type CleaningFrequencyChangeData = z.infer<
  typeof cleaningFrequencyChangeSchema
>;

export const weekDaySchema = z
  .object({
    weekDay: z.number().min(0).max(6)
  })
  .merge(cleaningFrequencyChangeSchema);

export type WeekDayChangeData = z.infer<typeof weekDaySchema>;

export const recurringReservationStatusChangeSchema = z.object({
  recurringReservationStatus: z.nativeEnum(RecurringReservationStatus),
  reservationStatus: z.nativeEnum(ReservationStatus)
});

export type RecurringReservationStatusChangeData = z.infer<
  typeof recurringReservationStatusChangeSchema
>;
