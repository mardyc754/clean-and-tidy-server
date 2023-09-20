import { z } from 'zod';

export const transformIdToNumber = z.string().transform((val) => parseInt(val));
