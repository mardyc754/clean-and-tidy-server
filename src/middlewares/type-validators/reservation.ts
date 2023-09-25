import {
  singleReservationCreationDataSchema,
  changeReservationDateSchema,
  changeReservationStatusSchema
} from '~/schemas/reservation';

import { validateTypes } from './validateTypesOfData';

export function validateSingleReservationCreationData() {
  return validateTypes({ bodyParser: singleReservationCreationDataSchema });
}

export function validateReservationDate() {
  return validateTypes({ bodyParser: changeReservationDateSchema });
}

export function validateReservationStatus() {
  return validateTypes({ bodyParser: changeReservationStatusSchema });
}
