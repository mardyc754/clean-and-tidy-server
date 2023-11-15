import {
  changeVisitDateSchema,
  changeVisitStatusSchema,
  singleVisitCreationDataSchema
} from '~/schemas/visit';

import { validateTypes } from './validateTypesOfData';

export function validateVisitCreationData() {
  return validateTypes({ bodyParser: singleVisitCreationDataSchema });
}

export function validateVisitDate() {
  return validateTypes({ bodyParser: changeVisitDateSchema });
}

export function validateVisitStatus() {
  return validateTypes({ bodyParser: changeVisitStatusSchema });
}
