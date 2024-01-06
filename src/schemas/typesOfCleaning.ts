import { Frequency } from '@prisma/client';
import { z } from 'zod';

export const changeServiceDataSchema = z.object({
  unit: z.object({
    price: z
      .number()
      .min(0.01, { message: 'Price must be greater than 0' })
      .max(9999.99, { message: 'Price must be less than 10000' })
  })
});

export type ChangeServiceData = z.infer<typeof changeServiceDataSchema>;

export const createServiceSchema = z.object({
  name: z.string().max(100),
  isPrimary: z.boolean().optional(),
  unit: z
    .object({
      shortName: z.string().max(40),
      fullName: z.string().max(40),
      price: z.number().max(300),
      duration: z.number().max(480)
    })
    .optional(),
  secondaryServices: z.number().int().array().optional(),
  detergentsCost: z.number().optional(),
  frequencies: z.array(z.nativeEnum(Frequency)).optional()
});

export type CreateServiceData = z.infer<typeof createServiceSchema>;

export const linkPrimarySecondaryServiceSchema = z.object({
  primaryServiceId: z.number().int(),
  secondaryServiceId: z.number().int()
});

export type PrimarySecondaryIds = z.infer<
  typeof linkPrimarySecondaryServiceSchema
>;
