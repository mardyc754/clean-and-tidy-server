import type { Request, Response } from 'express';
import { UserService } from '~/services';
import AbstractController from './AbstractController';

export default class UserController extends AbstractController {
  private userService = new UserService();

  constructor() {
    super('/users');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllUsers);
    this.router.get('/:id', this.getUserById);
    this.router.get('/:id/reservations', this.getUserReservations);
  }

  private getAllUsers = async (req: Request, res: Response) => {
    const users = await this.userService.getAllUsers();

    if (users !== null) {
      res.status(200).send({
        ...users
      });
    } else {
      res.status(400).send({ message: 'Error when receiving all users' });
    }
  };

  private getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'User id not provided' });
      return;
    }

    const user = await this.userService.getUserById(id);

    if (user) {
      res.status(201).send({
        ...user
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  };

  private getUserReservations = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'User id not provided' });
      return;
    }

    const reservations = await this.userService.getUserReservations(id);

    if (reservations !== null) {
      res.status(200).send({ data: reservations });
    } else {
      res.status(400).send({ message: 'Error when receiving reservations' });
    }
  };
}
