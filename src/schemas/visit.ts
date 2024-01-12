import { Status } from '@prisma/client';
import { z } from 'zod';

import { ISOString } from './common';

export const visitPartCreationData = z.object({
  employeeId: z.number().int(),
  serviceId: z.number().int(),
  numberOfUnits: z.number().int(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  cost: z.number()
});

export type VisitPartCreationData = z.infer<typeof visitPartCreationData>;

export const changeVisitDataSchema = z.object({
  id: z.number(),
  startDate: ISOString
});

export type ChangeVisitData = z.infer<typeof changeVisitDataSchema>;

export const changeVisitStatusSchema = z.object({
  status: z.nativeEnum(Status),
  employeeId: z.number()
});

export type ChangeVisitStatusData = z.infer<typeof changeVisitStatusSchema>;
