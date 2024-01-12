import {
  changeEmployeeDataSchema,
  employeeCreationSchema,
  employeeIdSchema,
  employeeQueryOptions,
  servicesWorkingHours
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
    queryParser: servicesWorkingHours
  });
};

export const validateEmployeeQueryOptions = () => {
  return validateTypes({
    queryParser: employeeQueryOptions
  });
};

export const validateEmployeeChangeData = () => {
  return validateTypes({
    bodyParser: changeEmployeeDataSchema
  });
};
