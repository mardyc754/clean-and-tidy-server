import { idIsNumericStringSchema } from '~/schemas/common';

import { validateTypes } from './validateTypesOfData';

export const validateIdIsNumericString = () => {
  return validateTypes({
    paramsParser: idIsNumericStringSchema
  });
};
