import { z } from 'zod';

export const createAnonymousClientSchema = z.object({
  email: z.string().email()
});

export type CreateAnonymousClientData = z.infer<
  typeof createAnonymousClientSchema
>;
