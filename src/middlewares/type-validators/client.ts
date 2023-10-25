import {
  clientUpdateDataSchema,
  createAnonymousClientSchema
} from '~/schemas/client';
import { validateTypes } from './validateTypesOfData';

export const validateClientUpdateData = () =>
  validateTypes({
    bodyParser: clientUpdateDataSchema
  });

export const validateCreateAnonymousClientData = () =>
  validateTypes({
    bodyParser: createAnonymousClientSchema
  });
