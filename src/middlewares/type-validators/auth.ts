import { validateTypes } from './validateTypesOfData';
import { currentUserSchema, loginSchema, registerSchema } from '~/schemas/auth';

export const checkLoginData = () => {
  return validateTypes({ bodyParser: loginSchema });
};

export const checkRegisterData = () => {
  return validateTypes({ bodyParser: registerSchema });
};

export const checkCurrentUserData = () => {
  return validateTypes({ bodyParser: currentUserSchema });
};
