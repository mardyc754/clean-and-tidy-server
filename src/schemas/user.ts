import { z } from 'zod';

export const userUpdateDataSchema = z
  .object({
    name: z.string().max(50),
    surname: z.string().max(50),
    phone: z.string().max(15) // TODO improve validator for phone
  })
  .strict()
  .partial();

export type UserUpdateData = z.infer<typeof userUpdateDataSchema>;
