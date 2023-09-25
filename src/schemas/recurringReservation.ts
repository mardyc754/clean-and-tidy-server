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
  userId: z.number().int(),
  addressId: z.number(),
  employeeId: z.number(),
  endDate: z.string().datetime(),
  reservationData: reservationCreationDataSchema
  // address: z.object({
  //   areaSize: z.number(),
  //   street: z.string().max(40),
  //   houseNumber: z.number().int(),
  //   postCode: z.string().length(6),
  //   city: z.string().max(40)
  // })
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
