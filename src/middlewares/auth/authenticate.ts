import jwt from 'jsonwebtoken';

import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from '~/constants';

// template for authentication
export function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies.token) {
    return res.status(401).send({ message: 'Credentials were not provided' });
  }

  try {
    const decoded = jwt.verify(req.cookies.token, JWT_SECRET);

    // compare decoded.id and decoded.role with provided data in the request body
    // for extra protection if needed

    if (decoded) {
      return next();
    }
  } catch (err) {
    res.status(403).send({ message: 'Invalid token' });
  }
}
