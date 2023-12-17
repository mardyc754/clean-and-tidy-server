import type { Client, Employee } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { omit } from 'lodash';

import { JWT_SECRET, UserRole } from '~/constants';

import { LoginData } from '~/schemas/auth';
import { UserUpdateData } from '~/schemas/common';

import {
  checkLoginData,
  checkRegisterData
} from '~/middlewares/type-validators/auth';

import { ClientService, EmployeeService } from '~/services';

import { advanceDateByHours } from '~/utils/dateUtils';

import type { DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class AuthController extends AbstractController {
  private clientService: ClientService;
  private employeeService: EmployeeService;

  constructor() {
    super('/auth');
    this.clientService = new ClientService();
    this.employeeService = new EmployeeService();

    this.createRouters();
  }

  public createRouters() {
    this.router.post('/register', checkRegisterData(), this.register);
    this.router.post('/login', checkLoginData(), this.login);
    this.router.post('/logout', this.logout);
    this.router.get('/user', this.getCurrentUser);
    this.router.put('/user', this.changeCurrentUserData);
  }

  private register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    let userExists = Boolean(
      await this.clientService.getClientByUsername(username)
    );

    if (userExists) {
      return res.status(409).send({
        message: 'User with given username already exists',
        affectedField: 'username',
        hasError: true
      });
    }

    userExists = Boolean(await this.clientService.getClientByEmail(email));

    if (!userExists) {
      userExists = Boolean(
        await this.employeeService.getEmployeeByEmail(email)
      );
    }

    if (userExists) {
      return res.status(409).send({
        message: 'User with given email already exists',
        affectedField: 'email',
        hasError: true
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await this.clientService.createClient({
      username,
      email,
      password: hashedPassword
    });

    if (user) {
      res.status(201).send({
        id: user.id,
        username: user.username,
        email: user.email,
        message: 'Client created succesfully'
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when creating new user', hasError: true });
    }
  };

  private login = async (
    req: TypedRequest<DefaultParamsType, LoginData>,
    res: Response
  ) => {
    const { email, password } = req.body;

    let role: UserRole | null = null;

    let user: Employee | Client | null =
      await this.employeeService.getEmployeeByEmail(email);

    if (!user) {
      user = await this.clientService.getClientByEmail(email);
    }

    if (!user || !user.password) {
      return res.status(user ? 400 : 404).send({
        message: 'User with given email does not exist',
        affectedField: 'email'
      });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res
        .status(400)
        .send({ message: 'Invalid password', affectedField: 'password' });
    }

    if ('isAdmin' in user) {
      role = user.isAdmin ? UserRole.ADMIN : UserRole.EMPLOYEE;
    } else {
      role = UserRole.CLIENT;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role
      },
      JWT_SECRET
    );

    res.cookie('authToken', token, {
      expires: advanceDateByHours(Date.now(), 8).toDate(), // cookie for 8 hours
      httpOnly: true
    });

    res.status(200).send({
      message: 'Logged in successfully',
      isAuthenticated: true,
      role,
      userId: user.id,
      email: user.email
    });
  };

  private logout = (_: Request, res: Response) => {
    res.cookie('authToken', '', { expires: new Date(0) });
    res
      .status(200)
      .send({ message: 'Logged out successfully', isAuthenticated: false });
  };

  private getCurrentUser = async (req: TypedRequest, res: Response) => {
    try {
      const decoded = jwt.verify(
        req.cookies.authToken,
        JWT_SECRET
      ) as jwt.JwtPayload;

      const { userId, role } = decoded;

      let user: Client | Omit<Employee, 'password'> | null = null;

      if (role === UserRole.CLIENT) {
        user = await this.clientService.getClientById(userId);
      } else if (role === UserRole.EMPLOYEE || role === UserRole.ADMIN) {
        user = await this.employeeService.getEmployeeById(userId);
      }

      if (!user) {
        return res.status(404).send({
          message: `User with id=${userId} and role=${role} does not exist`
        });
      }

      return res.status(200).send({
        ...omit(user, ['password', 'isAdmin', 'username']),
        role
      });
    } catch (err) {
      res.status(200).send({});
    }
  };

  private changeCurrentUserData = async (
    req: TypedRequest<DefaultParamsType, UserUpdateData>,
    res: Response
  ) => {
    try {
      const decoded = jwt.verify(
        req.cookies.authToken,
        JWT_SECRET
      ) as jwt.JwtPayload;

      const { userId, role } = decoded;

      const { firstName, lastName, phone } = req.body;

      let user: Omit<Client, 'password'> | Omit<Employee, 'password'> | null =
        null;

      if (role === UserRole.CLIENT) {
        user = await this.clientService.changeClientData(userId, {
          firstName,
          lastName,
          phone
        });
      } else if (role === UserRole.EMPLOYEE || role === UserRole.ADMIN) {
        user = await this.employeeService.changeEmployeeData(userId, {
          firstName,
          lastName,
          phone
        });
      }

      if (!user) {
        return res.status(404).send({
          message: `User with id=${userId} and role=${role} does not exist`
        });
      }

      return res.status(200).send({
        ...omit(user, ['password', 'isAdmin', 'username']),
        role
      });
    } catch (err) {
      res.status(200).send({});
    }
  };
}
