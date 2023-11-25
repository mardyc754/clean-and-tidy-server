import { Status } from '@prisma/client';
import { z } from 'zod';

import { ISOString } from './common';

export const reservationServiceSchema = z
  .object({
    serviceId: z.number().int(),
    isMainServiceForReservation: z.boolean()
  })
  .strict();

export const visitPartCreationData = z.object({
  employeeId: z.number().int(),
  serviceId: z.number().int(),
  numberOfUnits: z.number().int(),
  startDate: ISOString,
  endDate: ISOString,
  cost: z.number()
});

export type VisitPartCreationData = z.infer<typeof visitPartCreationData>;

export const visitCreationDataSchema = z.object({
  includeDetergents: z.boolean(),
  services: z.array(reservationServiceSchema).refine(
    (val) => {
      return (
        val.filter((service) => service.isMainServiceForReservation).length ===
        1
      );
    },
    { message: 'There must be exactly one main service for reservation' }
  ),
  visitParts: z.array(visitPartCreationData)
});

export type VisitCreationData = z.infer<typeof visitCreationDataSchema>;

export const singleVisitCreationDataSchema = z
  .object({
    reservationId: z.number()
  })
  .merge(visitCreationDataSchema);

export type SingleVisitCreationData = z.infer<
  typeof singleVisitCreationDataSchema
>;

export const changeVisitDateSchema = z.object({
  id: z.number(),
  startDate: ISOString,
  endDate: ISOString
});

export type ChangeVisitDateData = z.infer<typeof changeVisitDateSchema>;

export const changeVisitStatusSchema = z.object({
  status: z.nativeEnum(Status),
  employeeId: z.number()
});

export type ChangeVisitStatusData = z.infer<typeof changeVisitStatusSchema>;
