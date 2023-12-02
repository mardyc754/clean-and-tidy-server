import { Frequency } from '@prisma/client';
import { z } from 'zod';

import { stringifiedBoolean } from './common';

export const employeeCreationSchema = z
  .object({
    startHour: z.string().datetime(),
    endHour: z.string().datetime(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    password: z.string(),
    services: z.array(z.number()).nullish()
  })
  .strict();

export type EmployeeCreationData = z.infer<typeof employeeCreationSchema>;

export const employeeIdSchema = z.object({
  employeeId: z.number().int()
});

export type EmployeeIdData = z.infer<typeof employeeIdSchema>;

export const employeeQueryOptions = z.object({
  includeVisits: stringifiedBoolean.optional()
});

export type EmployeeQueryOptions = z.infer<typeof employeeQueryOptions>;

export const servicesWorkingHours = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  serviceIds: z.array(z.number()).optional(),
  frequency: z.nativeEnum(Frequency).optional()
});

export type ServicesWorkingHoursOptions = z.infer<typeof servicesWorkingHours>;
