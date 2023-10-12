import {
  FrequencyChangeSchema,
  recurringReservationCreationSchema,
  weekDaySchema
} from '~/schemas/recurringReservation';
import { validateTypes } from './validateTypesOfData';

export function validateRecurringReservationCreationData() {
  return validateTypes({ bodyParser: recurringReservationCreationSchema });
}

export function validateFrequency() {
  return validateTypes({ bodyParser: FrequencyChangeSchema });
}

export function validateWeekDay() {
  return validateTypes({ bodyParser: weekDaySchema });
}

export function validateStatusChange() {
  return validateTypes({ bodyParser: recurringReservationCreationSchema });
}
