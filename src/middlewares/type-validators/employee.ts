import { validateTypes } from './validateTypesOfData';
import { employeeCreationSchema, employeeIdSchema } from '~/schemas/employee';

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
