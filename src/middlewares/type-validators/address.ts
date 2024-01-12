import { address } from '~/schemas/reservation';

import { validateTypes } from './validateTypesOfData';

export const validateAddress = () => {
  return validateTypes({ bodyParser: address });
};
