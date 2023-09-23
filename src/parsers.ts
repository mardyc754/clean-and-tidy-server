import { z } from 'zod';

import { hourToISOString } from './utils/dateUtils';

export const transformIdToNumber = z.string().transform((val) => parseInt(val));

export const toISOHour = z
  .string()
  .refine((val) => {
    const hourParts = val.split(':').map((part) => parseInt(part));
    return (
      hourParts.length === 2 &&
      hourParts.every((part) => !Number.isNaN(part)) &&
      hourParts[0]! >= 0 &&
      hourParts[0]! < 24 &&
      hourParts[1]! >= 0 &&
      hourParts[1]! < 60
    );
  })
  .transform((val) => hourToISOString(val));

export const ISOString = z.string().datetime();

export const Employee = z.object({
  startHour: ISOString,
  endHour: ISOString,
  name: z.string(),
  surname: z.string(),
  email: z.string().email(),
  password: z.string()
});

export type ZodEmployee = z.infer<typeof Employee>;
