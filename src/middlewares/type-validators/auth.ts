import { validateTypes } from './validateTypesOfData';
import { loginSchema, registerSchema } from '~/schemas/auth';

export const validateLoginData = () => {
  return validateTypes({ bodyParser: loginSchema });
};

export const validateRegisterData = () => {
  return validateTypes({ bodyParser: registerSchema });
};
