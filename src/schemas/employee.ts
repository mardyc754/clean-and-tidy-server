import { z } from 'zod';

export const employeeCreationSchema = z.object({
  startHour: z.string().datetime(),
  endHour: z.string().datetime(),
  name: z.string(),
  surname: z.string(),
  email: z.string().email(),
  password: z.string(),
  services: z.array(z.number()).nullish()
});

export type EmployeeCreationData = z.infer<typeof employeeCreationSchema>;
