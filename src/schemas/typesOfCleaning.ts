import { z } from 'zod';

export const changeServicePriceSchema = z.object({
  id: z.number().int(),
  price: z.number().max(300)
});

export type ChangeServicePriceData = z.infer<typeof changeServicePriceSchema>;

export const createServiceSchema = z.object({
  name: z.string().max(100),
  isPrimary: z.boolean().optional(),
  unit: z
    .object({
      name: z.string().max(40),
      price: z.number().max(300),
      duration: z.number().max(480)
    })
    .optional()
});

export type CreateServiceData = z.infer<typeof createServiceSchema>;

export const linkPrimarySecondaryServiceSchema = z.object({
  primaryServiceId: z.number().int(),
  secondaryServiceId: z.number().int()
});

export type PrimarySecondaryIds = z.infer<
  typeof linkPrimarySecondaryServiceSchema
>;
