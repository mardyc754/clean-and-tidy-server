import type { RecurringReservationStatus, User } from '@prisma/client';
import type { Request, Response } from 'express';
import type { Stringified } from 'type-fest';

import { UserService } from '~/services';

import AbstractController from './AbstractController';
import { DefaultBodyType } from '~/types';
import { validateUserUpdateData } from '~/middlewares/type-validators/user';
import { UserUpdateData } from '~/schemas/user';

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
    this.router.put('/:id', validateUserUpdateData(), this.changeUserData);
    this.router.delete('/:id', this.deleteUserData);
  }

  private getAllUsers = async (_: Request, res: Response) => {
    const users = await this.userService.getAllUsers();

    if (users !== null) {
      res.status(200).send({
        data: users
      });
    } else {
      res.status(400).send({ message: 'Error when receiving all users' });
    }
  };

  private getUserById = async (req: Request<{ id: string }>, res: Response) => {
    const user = await this.userService.getUserById(parseInt(req.params.id));

    if (user) {
      res.status(200).send({
        data: user
      });
    } else {
      res
        .status(404)
        .send({ message: `User with id=${req.params.id} not found` });
    }
  };

  private getUserReservations = async (
    req: Request<
      Stringified<Pick<User, 'id'>>,
      DefaultBodyType,
      { status?: RecurringReservationStatus }
    >,
    res: Response
  ) => {
    const reservations = await this.userService.getUserReservations(
      parseInt(req.params.id),
      req.query.status as RecurringReservationStatus | undefined
    );

    if (reservations !== null) {
      res.status(200).send({ data: reservations });
    } else {
      res
        .status(404)
        .send({ message: `User with id=${req.params.id} not found` });
    }
  };

  private getUserAddresses = async (
    req: Request<Stringified<Pick<User, 'id'>>>,
    res: Response
  ) => {
    const addresses = await this.userService.getUserAddresses(
      parseInt(req.params.id)
    );

    if (addresses !== null) {
      res.status(200).send({ data: addresses });
    } else {
      res
        .status(404)
        .send({ message: `User with id=${req.params.id} not found` });
    }
  };

  private changeUserData = async (
    req: Request<Stringified<Pick<User, 'id'>>, UserUpdateData>,
    res: Response
  ) => {
    const newData = await this.userService.changeUserData({
      id: parseInt(req.params.id),
      ...req.body
    });

    if (newData !== null) {
      res.status(200).send({ data: newData });
    } else {
      res
        .status(404)
        .send({ message: `User with id=${req.params.id} not found` });
    }
  };

  private deleteUserData = async (
    req: Request<Stringified<Pick<User, 'id'>>>,
    res: Response
  ) => {
    const deletedUser = await this.userService.deleteUser(
      parseInt(req.params.id)
    );

    if (deletedUser !== null) {
      res.status(200).send({ data: deletedUser });
    } else {
      res
        .status(404)
        .send({ message: `User with id=${req.params.id} not found` });
    }
  };
}
