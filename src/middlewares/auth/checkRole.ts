import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { JWT_SECRET, UserRole } from '~/constants';

type AuthenticationData = { acceptableRoles: UserRole[] };

function checkRole(data?: AuthenticationData) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies.authToken) {
      return res.status(401).send({ message: 'Credentials were not provided' });
    }

    try {
      const decoded = jwt.verify(req.cookies.authToken, JWT_SECRET) as jwt.JwtPayload;

      if (data?.acceptableRoles && !data.acceptableRoles.includes(decoded.role)) {
        return res.status(403).send({
          message: 'Cannot access resource with given permissions'
        });
      }

      if (decoded) {
        return next();
      }
    } catch (err) {
      res.status(403).send({ message: 'Invalid token', hasError: true });
    }
  };
}

export function checkAccessToClientData() {
  return checkRole({ acceptableRoles: [UserRole.CLIENT, UserRole.ADMIN] });
}

export function checkIsEmployee() {
  return checkRole({ acceptableRoles: [UserRole.EMPLOYEE, UserRole.ADMIN] });
}

export function checkIsAdmin() {
  return checkRole({ acceptableRoles: [UserRole.ADMIN] });
}
