import { z } from 'zod';
import { ISOString } from './common';
import { Status } from '@prisma/client';

export const visitCreationDataSchema = z.object({
  endDate: ISOString,
  startDate: ISOString,
  includeDetergents: z.boolean(),
  cost: z.number(),
  employeeIds: z.array(z.number().int())
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
  status: z.nativeEnum(Status)
});

export type ChangeVisitStatusData = z.infer<typeof changeVisitStatusSchema>;
