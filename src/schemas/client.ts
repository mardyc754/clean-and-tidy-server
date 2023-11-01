import { z } from 'zod';

export const clientUpdateDataSchema = z
  .object({
    name: z.string().max(50),
    lastName: z.string().max(50),
    phone: z.string().max(15) // TODO improve validator for phone
  })
  .strict()
  .partial();

export type ClientUpdateData = z.infer<typeof clientUpdateDataSchema>;

export const createAnonymousClientSchema = z.object({
  email: z.string().email()
});

export type CreateAnonymousClientData = z.infer<
  typeof createAnonymousClientSchema
>;
