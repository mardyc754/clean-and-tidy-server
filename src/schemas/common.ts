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

export const stringifiedBoolean = z
  .string()
  .refine((value) => value === 'true' || value === 'false');

export const userUpdateDataSchema = z
  .object({
    firstName: z.string().max(50),
    lastName: z.string().max(50),
    phone: z.string().max(15).nullish() // TODO improve validator for phone
  })
  .strict()
  .partial();

export type UserUpdateData = z.infer<typeof userUpdateDataSchema>;

export const price = z
  .string()
  .transform((val) => parseFloat(val))
  .refine(
    (val) => {
      return !isNaN(val);
    },
    { message: 'Price must be a valid number' }
  )
  .refine((val) => val > 0, { message: 'Price must be greater than 0' })
  .refine((val) => val < 10000, {
    message: 'Price must be less than 10000'
  });
