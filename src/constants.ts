import 'dotenv/config';

export const JWT_SECRET = process.env.JWT_SECRET || 'some_very_secret_key';

export enum UserRole {
  CLIENT = 'client',
  EMPLOYEE = 'employee',
  ADMIN = 'admin'
}

// role provided from the frontend
export enum LoginRole {
  CLIENT = 'client',
  EMPLOYEE = 'employee'
}
