import { Frequency, Status } from '@prisma/client';
import { z } from 'zod';

import { visitCreationDataSchema } from './visit';

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

export const reservationServiceSchema = z
  .object({
    serviceId: z.number().int(),
    isMainServiceForReservation: z.boolean(),
    numberOfUnits: z.number().int()
  })
  .strict();

export const reservationCreationSchema = z
  .object({
    frequency: FrequencySchema,
    bookerEmail: z.string().email(),
    // endDate: z.string().datetime(),
    visitData: visitCreationDataSchema,
    address: address.or(z.number().int()),
    contactDetails,
    services: z.array(reservationServiceSchema).refine(
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

export const StatusChangeSchema = z.object({
  status: z.nativeEnum(Status)
});

// types

export type ReservationService = z.infer<typeof reservationServiceSchema>;

export type ReservationCreationData = z.infer<typeof reservationCreationSchema>;

export type FrequencyChangeData = z.infer<typeof FrequencyChangeSchema>;

export type WeekDayChangeData = z.infer<typeof weekDaySchema>;

export type StatusChangeData = z.infer<typeof StatusChangeSchema>;
