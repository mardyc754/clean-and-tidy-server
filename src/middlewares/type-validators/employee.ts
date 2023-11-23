import {
  employeeCreationSchema,
  employeeIdSchema,
  employeeQueryOptions,
  employeeWorkingHoursSchema
} from '~/schemas/employee';

import { validateTypes } from './validateTypesOfData';

export const validateEmployeeCreationData = () => {
  return validateTypes({
    bodyParser: employeeCreationSchema
  });
};

export const validateEmployeeId = () => {
  return validateTypes({
    bodyParser: employeeIdSchema
  });
};

export const validateWorkingHoursRange = () => {
  return validateTypes({
    queryParser: employeeWorkingHoursSchema
  });
};

export const validateEmployeeQueryOptions = () => {
  return validateTypes({
    queryParser: employeeQueryOptions
  });
};
