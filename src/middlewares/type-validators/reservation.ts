import {
  FrequencyChangeSchema,
  StatusChangeSchema,
  reservationCreationSchema,
  weekDaySchema
} from '~/schemas/reservation';

import { validateTypes } from './validateTypesOfData';

export function validateReservationCreationData() {
  return validateTypes({ bodyParser: reservationCreationSchema });
}

export function validateFrequency() {
  return validateTypes({ bodyParser: FrequencyChangeSchema });
}

export function validateWeekDay() {
  return validateTypes({ bodyParser: weekDaySchema });
}

export function validateStatusChange() {
  return validateTypes({ bodyParser: StatusChangeSchema });
}
