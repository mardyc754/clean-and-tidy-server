import { z } from 'zod';

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

export const employeeAvailabilitySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export type EmployeeAvailabilityQueryOptions = z.infer<
  typeof employeeAvailabilitySchema
>;
