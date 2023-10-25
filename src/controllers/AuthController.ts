import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import type { Employee, Client } from '@prisma/client';

import { JWT_SECRET, UserRole } from '~/constants';
import { ClientService, EmployeeService } from '~/services';
import { LoginData } from '~/schemas/auth';
import {
  validateLoginData,
  validateRegisterData
} from '~/middlewares/type-validators/auth';
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
    this.router.post('/register', validateRegisterData(), this.register);
    this.router.post('/login', validateLoginData(), this.login);
    this.router.post('/logout', this.logout);
  }

  private register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    let userExists = Boolean(
      await this.clientService.getClientByUsername(username)
    );

    if (userExists) {
      return res.status(409).send({
        message: 'User with given username already exists',
        affectedField: 'username'
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
        affectedField: 'email'
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
        message: 'User created succesfully'
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
        hasError: true
      });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res
        .status(400)
        .send({ message: 'Invalid password', hasError: true });
    }

    if ('isAdmin' in user) {
      role = user.isAdmin ? UserRole.ADMIN : UserRole.EMPLOYEE;
    } else {
      role = UserRole.CLIENT;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role
      },
      JWT_SECRET
    );

    res.cookie('authToken', token, {
      expires: new Date(Date.now() + 8 * 3600000), // cookie for 8 hours
      httpOnly: true
    });

    res
      .status(200)
      .send({ message: 'Logged in successfully', isAuthenticated: true, role });
  };

  private logout = (_: Request, res: Response) => {
    res.cookie('authToken', '', { expires: new Date(0) });
    res
      .status(200)
      .send({ message: 'Logged out successfully', isAuthenticated: false });
  };
}
