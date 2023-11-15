import { employeeCreationSchema, employeeIdSchema } from '~/schemas/employee';

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
