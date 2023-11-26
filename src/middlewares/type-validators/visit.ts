import {
  changeVisitDateSchema,
  changeVisitStatusSchema,
  visitPartCreationData
} from '~/schemas/visit';

import { validateTypes } from './validateTypesOfData';

export function validateVisitCreationData() {
  return validateTypes({ bodyParser: visitPartCreationData });
}

export function validateVisitDate() {
  return validateTypes({ bodyParser: changeVisitDateSchema });
}

export function validateVisitStatus() {
  return validateTypes({ bodyParser: changeVisitStatusSchema });
}
