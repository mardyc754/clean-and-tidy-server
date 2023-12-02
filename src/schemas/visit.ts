import { Status } from '@prisma/client';
import { z } from 'zod';

import { ISOString } from './common';

export const visitPartCreationData = z.object({
  employeeId: z.number().int(),
  serviceId: z.number().int(),
  numberOfUnits: z.number().int(),
  startDate: ISOString,
  endDate: ISOString,
  cost: z.number()
});

export type VisitPartCreationData = z.infer<typeof visitPartCreationData>;

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
