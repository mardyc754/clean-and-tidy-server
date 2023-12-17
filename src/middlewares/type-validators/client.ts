import { createAnonymousClientSchema } from '~/schemas/client';
import { userUpdateDataSchema } from '~/schemas/common';

import { validateTypes } from './validateTypesOfData';

export const validateClientUpdateData = () =>
  validateTypes({
    bodyParser: userUpdateDataSchema
  });

export const validateCreateAnonymousClientData = () =>
  validateTypes({
    bodyParser: createAnonymousClientSchema
  });
