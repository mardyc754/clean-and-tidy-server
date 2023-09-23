import { ParamsDictionary, Query } from 'express-serve-static-core';
import type { Response, NextFunction } from 'express';

import { Employee, type ZodEmployee } from '~/parsers';
import { TypedRequest } from '~/types';

export const verifyEmployeeData = (
  req: TypedRequest<ParamsDictionary, ZodEmployee, Query>,
  res: Response,
  next: NextFunction
) => {
  try {
    Employee.parse(req.body);
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .send({ message: 'Error when parsing employee data' });
  }

  return next();
};
