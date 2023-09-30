import { userUpdateDataSchema } from '~/schemas/user';
import { validateTypes } from './validateTypesOfData';

export const validateClientUpdateData = () =>
  validateTypes({
    bodyParser: userUpdateDataSchema
  });
