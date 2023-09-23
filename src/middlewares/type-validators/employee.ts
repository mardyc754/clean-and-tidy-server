import { validateTypes } from './validateTypesOfData';
import { employeeCreationSchema } from '~/schemas/employee';

export const validateEmployeeCreationData = () => {
  return validateTypes({
    bodyParser: employeeCreationSchema
  });
};
