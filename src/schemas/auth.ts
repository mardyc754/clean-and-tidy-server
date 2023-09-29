import { z } from 'zod';
import { LoginRole } from '~/constants';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  loginAs: z.nativeEnum(LoginRole)
});

export type LoginData = z.infer<typeof loginSchema>;
