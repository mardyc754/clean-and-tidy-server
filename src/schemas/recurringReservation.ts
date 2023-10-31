import { Frequency, ReservationStatus } from '@prisma/client';
import { z } from 'zod';
import { reservationCreationDataSchema } from './reservation';

const FrequencySchema = z.nativeEnum(Frequency);

export const address = z
  .object({
    street: z.string().max(40),
    houseNumber: z.string().max(6),
    postCode: z.string().length(6),
    city: z.string().max(40)
  })
  .strict();

// schemas
export const contactDetails = z
  .object({
    firstName: z.string().max(50),
    lastName: z.string().max(50),
    phone: z.string().max(15),
    email: z.string().email()
  })
  .strict();

export const recurringReservationServiceSchema = z
  .object({
    serviceId: z.number().int(),
    isMainServiceForReservation: z.boolean(),
    numberOfUnits: z.number().int()
  })
  .strict();

export const recurringReservationCreationSchema = z
  .object({
    frequency: FrequencySchema,
    clientId: z.number().int(), // it can be an client email as well
    // endDate: z.string().datetime(),
    reservationData: reservationCreationDataSchema,
    address: address.or(z.number().int()),
    contactDetails,
    services: z.array(recurringReservationServiceSchema).refine(
      (val) => {
        return (
          val.filter((service) => service.isMainServiceForReservation)
            .length === 1
        );
      },
      { message: 'There must be exactly one main service for reservation' }
    )
  })
  .strict();

export const FrequencyChangeSchema = z.object({
  frequency: FrequencySchema
});

export const weekDaySchema = z
  .object({
    weekDay: z.number().min(0).max(6)
  })
  .merge(FrequencyChangeSchema);

export const ReservationStatusChangeSchema = z.object({
  ReservationStatus: z.nativeEnum(ReservationStatus),
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

export type ReservationStatusChangeData = z.infer<
  typeof ReservationStatusChangeSchema
>;
