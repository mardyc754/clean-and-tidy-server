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
  period: z
    .string()
    .refine((value) => {
      return (
        value.split('-').length === 2 &&
        value[0]?.length === 4 &&
        value[1]?.length === 2
      );
    })
    .optional(),
  serviceIds: z.array(z.number()).optional(),
  frequency: z.nativeEnum(Frequency).optional(),
  excludeFrom: z.string().datetime().optional(),
  excludeTo: z.string().datetime().optional()
});

export type ServicesWorkingHoursOptions = z.infer<typeof servicesWorkingHours>;

export const employeeWorkingHours = z.object({
  period: z
    .string()
    .refine((value) => {
      return (
        value.split('-').length === 2 &&
        value[0]?.length === 4 &&
        value[1]?.length === 2
      );
    })
    .optional(),
  frequency: z.nativeEnum(Frequency).optional(),
  visitIds: z.array(z.number()).optional(),
  excludeFrom: z.string().datetime().optional(),
  excludeTo: z.string().datetime().optional()
});

export type EmployeeWorkingHoursOptions = z.infer<typeof employeeWorkingHours>;
