import {
  changeServiceDataSchema,
  createServiceSchema
} from '~/schemas/typesOfCleaning';

import { validateTypes } from './validateTypesOfData';

export function validateServiceCreationData() {
  return validateTypes({ bodyParser: createServiceSchema });
}

export function validateServiceChangeData() {
  return validateTypes({ bodyParser: changeServiceDataSchema });
}
