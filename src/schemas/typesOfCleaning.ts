import { z } from 'zod';

export const changeServicePriceSchema = z.object({
  id: z.number().int(),
  price: z.number().max(300)
});

export type ChangeServicePriceData = z.infer<typeof changeServicePriceSchema>;
