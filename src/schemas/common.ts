import { z } from 'zod';

export const idIsNumericStringSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val))
    .refine((result) => !isNaN(result))
});

export type IdType = z.infer<typeof idIsNumericStringSchema>;

export const isHourStringSchema = z.string().refine((val) => {
  const hourParts = val.split(':').map((part) => parseInt(part));
  return (
    hourParts.length === 2 &&
    hourParts.every((part) => !Number.isNaN(part)) &&
    hourParts[0]! >= 0 &&
    hourParts[0]! < 24 &&
    hourParts[1]! >= 0 &&
    hourParts[1]! < 60
  );
});

export const ISOString = z.string().datetime();
