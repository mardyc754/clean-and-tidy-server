import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import type { RequireAtLeastOne } from 'type-fest';

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
    this.router.get('/:id/addresses', this.getUserAddresses);
    this.router.put('/:id', this.changeUserData);
    this.router.delete('/:id', this.deleteUserData);
  }

  private getAllUsers = async (_: Request, res: Response) => {
    const users = await this.userService.getAllUsers();

    if (users !== null) {
      res.status(200).send({
        ...users
      });
    } else {
      res.status(400).send({ message: 'Error when receiving all users' });
    }
  };

  private getUserById = async (
    req: Request<Pick<User, 'id'>>,
    res: Response
  ) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'User id not provided' });
      return;
    }

    const user = await this.userService.getUserById(id);

    if (user) {
      res.status(200).send({
        ...user
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  };

  private getUserReservations = async (
    req: Request<Pick<User, 'id'>>,
    res: Response
  ) => {
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

  private getUserAddresses = async (
    req: Request<Pick<User, 'id'>>,
    res: Response
  ) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'User id not provided' });
      return;
    }

    const addresses = await this.userService.getUserAddresses(id);

    if (addresses !== null) {
      res.status(200).send({ data: addresses });
    } else {
      res.status(400).send({ message: 'Error when receiving addresses' });
    }
  };

  private changeUserData = async (
    req: Request<{ data: RequireAtLeastOne<User, 'id'> }>,
    res: Response
  ) => {
    const { id } = req.params.data;

    if (!id) {
      res.status(400).send({ message: 'User id not provided' });
      return;
    }

    const newData = await this.userService.changeUserData(req.params.data);

    if (newData !== null) {
      res.status(200).send({ data: newData });
    } else {
      res.status(400).send({ message: 'Error when changing user data' });
    }
  };

  private deleteUserData = async (
    req: Request<Pick<User, 'id'>>,
    res: Response
  ) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).send({ message: 'User id not provided' });
      return;
    }

    const deletedUser = await this.userService.deleteUser(id);

    if (deletedUser !== null) {
      res.status(200).send({ data: deletedUser });
    } else {
      res.status(400).send({ message: 'Error when deleting user' });
    }
  };
}
