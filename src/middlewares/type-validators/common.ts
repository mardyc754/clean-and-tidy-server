import { validateTypes } from './validateTypesOfData';
import { idIsNumericStringSchema } from '~/schemas/common';

export const validateIdIsNumericString = () => {
  return validateTypes({
    paramsParser: idIsNumericStringSchema
  });
};
