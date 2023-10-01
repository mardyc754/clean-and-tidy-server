import { userUpdateDataSchema } from '~/schemas/client';
import { validateTypes } from './validateTypesOfData';

export const validateClientUpdateData = () =>
  validateTypes({
    bodyParser: userUpdateDataSchema
  });
