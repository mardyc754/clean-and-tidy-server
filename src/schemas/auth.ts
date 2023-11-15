import { z } from 'zod';

import { UserRole } from '~/constants';

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

export const currentUserSchema = z.object({
  userId: z.number().int(),
  role: z.nativeEnum(UserRole),
  email: z.string().email()
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
