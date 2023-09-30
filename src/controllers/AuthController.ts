import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { JWT_SECRET, ClientRole as UserRole } from '~/constants';
import { ClientService, EmployeeService } from '~/services';
import { DefaultParamsType, TypedRequest } from '~/types';
import { LoginData } from '~/schemas/auth';

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
    this.router.post('/register', this.register);
    this.router.post('/login-client', this.loginClient);
    this.router.post('/login-employee', this.loginEmployee);
    this.router.post('/logout', this.logout);
  }

  private register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    let user = await this.clientService.getClientByClientname(username);

    if (user !== null) {
      res
        .status(409)
        .send({ message: 'Client with given username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    user = await this.clientService.createClient(
      username,
      email,
      hashedPassword
    );

    if (user) {
      res.status(201).send({
        id: user?.id,
        username: user?.username,
        message: 'Client created succesfully'
      });
    } else {
      res.status(400).send({ message: 'Error when creating new user' });
    }
  };

  private loginClient = async (
    req: TypedRequest<DefaultParamsType, LoginData>,
    res: Response
  ) => {
    const { email, password } = req.body;

    const user = await this.clientService.getClientByEmail(email);

    if (!user) {
      return res
        .status(404)
        .send({ message: 'Client with given email does not exist' });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res.status(400).send({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: UserRole.CLIENT },
      JWT_SECRET
    );

    res.cookie('token', token, {
      expires: new Date(Date.now() + 8 * 3600000), // cookie for 8 hours
      httpOnly: true
    });

    res.status(200).send({ message: 'Login success', isAuthenticated: true });
  };

  private loginEmployee = async (
    req: TypedRequest<DefaultParamsType, LoginData>,
    res: Response
  ) => {
    const { email, password } = req.body;

    const user = await this.employeeService.getEmployeeByEmail(email);

    if (!user) {
      return res
        .status(404)
        .send({ message: 'Employee with given email does not exist' });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return res.status(400).send({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.isAdmin ? UserRole.ADMIN : UserRole.EMPLOYEE
      },
      JWT_SECRET
    );

    res.cookie('token', token, {
      expires: new Date(Date.now() + 8 * 3600000), // cookie for 8 hours
      httpOnly: true
    });

    res
      .status(200)
      .send({ message: 'Logged in successfully', isAuthenticated: true });
  };

  private logout = (_: Request, res: Response) => {
    res.cookie('token', '', { expires: new Date(0) });
    res
      .status(200)
      .send({ message: 'Logged out successfully', isAuthenticated: false });
  };

  // if it is better to create one enpoint
  // private login = async (
  //   req: TypedRequest<DefaultParamsType, LoginData>,
  //   res: Response
  // ) => {
  //   const { email, password, loginAs } = req.body;

  //   const user =
  //     loginAs === LoginRole.EMPLOYEE
  //       ? await this.employeeService.getEmployeeByEmail(email)
  //       : await this.clientService.getClientByEmail(email);

  //   if (!user) {
  //     return res
  //       .status(404)
  //       .send({ message: 'Employee with given email does not exist' });
  //   }

  //   const passwordsMatch = await bcrypt.compare(password, user.password);

  //   if (!passwordsMatch) {
  //     return res.status(400).send({ message: 'Invalid password' });
  //   }

  //   let role: UserRole;

  //   if (loginAs === LoginRole.EMPLOYEE) {
  //     role = (
  //       user as NonNullable<
  //         Awaited<ReturnType<EmployeeService['getEmployeeByEmail']>>
  //       >
  //     ).isAdmin
  //       ? UserRole.ADMIN
  //       : UserRole.EMPLOYEE;
  //   } else {
  //     role = UserRole.CLIENT;
  //   }

  //   const token = jwt.sign(
  //     {
  //       id: user.id,
  //       email: user.email,
  //       role
  //     },
  //     JWT_SECRET
  //   );

  //   res.cookie('token', token, {
  //     expires: new Date(Date.now() + 8 * 3600000), // cookie for 8 hours
  //     httpOnly: true
  //   });

  //   res.status(200).send({ message: 'Login success', isAuthenticated: true });
  // };
}
