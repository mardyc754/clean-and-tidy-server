import {
  Frequency,
  RecurringReservationStatus,
  ReservationStatus
} from '@prisma/client';
import { z } from 'zod';
import { reservationCreationDataSchema } from './reservation';

const FrequencySchema = z.nativeEnum(Frequency);

// schemas

export const recurringReservationServiceSchema = z.object({
  serviceId: z.number().int(),
  recurringReservationId: z.number().int(),
  isMainServiceForReservation: z.boolean(),
  numberOfUnits: z.number().int()
});

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
    .or(z.number().int()),
  bookerFirstName: z.string().max(50),
  bookerLastName: z.string().max(50),
  services: z.array(recurringReservationServiceSchema).refine(
    (val) => {
      return (
        val.filter((service) => service.isMainServiceForReservation).length ===
        1
      );
    },
    { message: 'There must be exactly one main service for reservation' }
  )
});

export const FrequencyChangeSchema = z.object({
  frequency: FrequencySchema
});

export const weekDaySchema = z
  .object({
    weekDay: z.number().min(0).max(6)
  })
  .merge(FrequencyChangeSchema);

export const recurringReservationStatusChangeSchema = z.object({
  recurringReservationStatus: z.nativeEnum(RecurringReservationStatus),
  reservationStatus: z.nativeEnum(ReservationStatus)
});

// types

export type RecurringReservationService = z.infer<
  typeof recurringReservationServiceSchema
>;

export type RecurringReservationCreationData = z.infer<
  typeof recurringReservationCreationSchema
>;

export type FrequencyChangeData = z.infer<typeof FrequencyChangeSchema>;

export type WeekDayChangeData = z.infer<typeof weekDaySchema>;

export type RecurringReservationStatusChangeData = z.infer<
  typeof recurringReservationStatusChangeSchema
>;
