import { z } from 'zod';
// import { LoginRole } from '~/constants';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
  // loginAs: z.nativeEnum(LoginRole)
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().max(32),
  username: z.string().max(30)
});

export type RegisterData = z.infer<typeof registerSchema>;
