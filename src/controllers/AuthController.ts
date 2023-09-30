import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { JWT_SECRET, LoginRole, ClientRole } from '~/constants';
import { EmployeeService, ClientService } from '~/services';
import { DefaultParamsType, TypedRequest } from '~/types';
import { LoginData } from '~/schemas/auth';

import AbstractController from './AbstractController';

export default class AuthController extends AbstractController {
  private userService: ClientService;
  private employeeService: EmployeeService;

  constructor() {
    super('/auth');
    this.userService = new ClientService();
    this.employeeService = new EmployeeService();
    this.createRouters();
  }

  public createRouters() {
    this.router.post('/register', this.register);
    this.router.post('/login', this.login);
    // this.router.post('/logout', this.logout);
  }

  private register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    let user = await this.userService.getClientByClientname(username);

    if (user !== null) {
      res
        .status(409)
        .send({ message: 'Client with given username already exists' });
      return;
    }

    // const hashedPassword = await bcrypt.hash(password, 8);
    user = await this.userService.createClient(username, email, password);

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

  private login = async (
    req: TypedRequest<DefaultParamsType, LoginData>,
    res: Response
  ) => {
    const { email, password } = req.body;

    const user = await this.userService.getClientByEmail(email);

    if (!user) {
      return res
        .status(404)
        .send({ message: 'Client with given email does not exist' });
    }

    // const passwordsMatch = await bcrypt.compare(password, user.password);
    const passwordsMatch = password === user.password;

    if (!passwordsMatch) {
      return res.status(400).send({ message: 'Invalid password' });
    }

    const payload = { id: user.id, email: user.email, role: ClientRole.CLIENT };

    const token = jwt.sign(payload, JWT_SECRET);

    res.cookie('token', token, {
      expires: new Date(Date.now() + 8 * 3600000), // cookie for 8 hours
      httpOnly: true
    });

    res.status(200).send({ message: 'Login success', isAuthenticated: true });
  };
}
