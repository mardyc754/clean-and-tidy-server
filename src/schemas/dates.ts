import { z } from 'zod';

export const getHolidaysQuerySchema = z.object({
  year: z
    .string()
    .refine((val) => !isNaN(parseInt(val)), {
      message: 'Year must be a number'
    })
    .optional()
});

export type GetHolidaysQueryType = z.infer<typeof getHolidaysQuerySchema>;
