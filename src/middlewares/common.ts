import type { Response, NextFunction, Request } from 'express';
import { transformIdToNumber } from '~/parsers';

export const validateIdFromParams = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    transformIdToNumber.parse(req.params.id);
  } catch (err) {
    return res.status(400).send({ message: 'Wrong type of provided id' });
  }

  return next();
};
