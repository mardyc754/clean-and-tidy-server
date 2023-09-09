import type { Request, Response } from 'express';

import { UserService } from '~/services';
import AbstractController from './AbstractController';

export default class AuthController extends AbstractController {
  private userService: UserService;

  constructor() {
    super('/auth');
    this.userService = new UserService();
    this.createRouters();
  }

  public createRouters() {
    this.router.post('/register', this.register);
    // this.router.post('/login', this.login);
    // this.router.post('/logout', this.logout);
  }

  private register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    let user = await this.userService.getUserByUsername(username);

    if (user !== null) {
      res
        .status(409)
        .send({ message: 'User with given username already exists' });
      return;
    }

    // const hashedPassword = await bcrypt.hash(password, 8);
    user = await this.userService.createUser(username, email, password);

    if (user) {
      res.status(201).send({
        id: user?.id,
        username: user?.username,
        message: 'User created succesfully'
      });
    } else {
      res.status(400).send({ message: 'Error when creating new user' });
    }
  };
}
