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

  const userExists =
    Boolean(await clientService.getClientByEmail(email)) ||
    Boolean(await employeeService.getEmployeeByEmail(email));

  if (userExists) {
    return res.status(409).send({
      message: 'User with given email already exists',
      affectedField: 'email'
    });
  }

  return next();
}
