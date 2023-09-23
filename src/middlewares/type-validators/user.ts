import { userUpdateDataSchema } from '~/schemas/user';
import { validateTypes } from './validateTypesOfData';

export const validateUserUpdateData = () =>
  validateTypes({
    bodyParser: userUpdateDataSchema
  });
