import type { NextFunction, Request, Response } from 'express';

import { ClientService, EmployeeService } from '~/services';

export async function checkIfUserExisits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;

  const employeeService = new EmployeeService();
  const clientService = new ClientService();

  let userExists = Boolean(await clientService.getClientByEmail(email));

  if (userExists) {
    return res.status(409).send({
      message: 'User with given email already exists',
      affectedField: 'email',
      hasError: true
    });
  }

  userExists = Boolean(await employeeService.getEmployeeByEmail(email));

  if (userExists) {
    return res.status(409).send({
      message: 'User with given email already exists',
      affectedField: 'email',
      hasError: true
    });
  }

  return next();
}
