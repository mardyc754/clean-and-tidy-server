import { createServiceSchema } from '~/schemas/typesOfCleaning';
import { validateTypes } from './validateTypesOfData';

export function validateServiceCreationData() {
  return validateTypes({ bodyParser: createServiceSchema });
}
