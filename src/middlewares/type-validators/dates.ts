import { getHolidaysQuerySchema } from '~/schemas/dates';

import { validateTypes } from './validateTypesOfData';

export const validateGetHolidaysQuery = () => {
  return validateTypes({
    queryParser: getHolidaysQuerySchema
  });
};
