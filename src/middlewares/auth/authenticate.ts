import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

import { JWT_SECRET, UserRole } from '~/constants';

type AuthenticationData = { acceptableRoles: UserRole[] };

function authenticate(data?: AuthenticationData) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log({ cookies: req.cookies });
    if (!req.cookies.authToken) {
      return res.status(401).send({ message: 'Credentials were not provided' });
    }

    try {
      const decoded = jwt.verify(
        req.cookies.authToken,
        JWT_SECRET
      ) as jwt.JwtPayload;

      if (
        data?.acceptableRoles &&
        !data.acceptableRoles.includes(decoded.role)
      ) {
        return res
          .status(403)
          .send({ message: 'Cannot access resource with given permissions' });
      }

      if (decoded) {
        return next();
      }
    } catch (err) {
      res.status(403).send({ message: 'Invalid token' });
    }
  };
}

export function validateAccessToClientData() {
  return authenticate({ acceptableRoles: [UserRole.CLIENT, UserRole.ADMIN] });
}

export function validateIsEmployee() {
  return authenticate({ acceptableRoles: [UserRole.EMPLOYEE, UserRole.ADMIN] });
}

export function validateIsAdmin() {
  return authenticate({ acceptableRoles: [UserRole.ADMIN] });
}
