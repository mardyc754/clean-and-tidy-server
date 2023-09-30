import type { RecurringReservationStatus, Client } from '@prisma/client';
import type { Request, Response } from 'express';
import type { Stringified } from 'type-fest';

import { ClientService } from '~/services';

import { validateClientUpdateData } from '~/middlewares/type-validators/client';
import { ClientUpdateData } from '~/schemas/client';
import type { DefaultBodyType } from '~/types';

import AbstractController from './AbstractController';
import { authenticate } from '~/middlewares/auth/authenticate';

export default class ClientController extends AbstractController {
  private userService = new ClientService();

  constructor() {
    super('/clients');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllClients);
    this.router.get('/:id', this.getClientById);
    this.router.get(
      '/:id/reservations',
      authenticate,
      this.getClientReservations
    );
    this.router.get('/:id/addresses', this.getClientAddresses);
    this.router.put('/:id', validateClientUpdateData(), this.changeClientData);
    this.router.delete('/:id', this.deleteClientData);
  }

  private getAllClients = async (_: Request, res: Response) => {
    const users = await this.userService.getAllClients();

    if (users !== null) {
      res.status(200).send({
        data: users
      });
    } else {
      res.status(400).send({ message: 'Error when receiving all users' });
    }
  };

  private getClientById = async (
    req: Request<{ id: string }>,
    res: Response
  ) => {
    const user = await this.userService.getClientById(parseInt(req.params.id));

    if (user) {
      res.status(200).send({
        data: user
      });
    } else {
      res
        .status(404)
        .send({ message: `Client with id=${req.params.id} not found` });
    }
  };

  private getClientReservations = async (
    req: Request<
      Stringified<Pick<Client, 'id'>>,
      DefaultBodyType,
      { status?: RecurringReservationStatus }
    >,
    res: Response
  ) => {
    const reservations = await this.userService.getClientReservations(
      parseInt(req.params.id),
      req.query.status as RecurringReservationStatus | undefined
    );

    if (reservations !== null) {
      res.status(200).send({ data: reservations });
    } else {
      res
        .status(404)
        .send({ message: `Client with id=${req.params.id} not found` });
    }
  };

  private getClientAddresses = async (
    req: Request<Stringified<Pick<Client, 'id'>>>,
    res: Response
  ) => {
    const addresses = await this.userService.getClientAddresses(
      parseInt(req.params.id)
    );

    if (addresses !== null) {
      res.status(200).send({ data: addresses });
    } else {
      res
        .status(404)
        .send({ message: `Client with id=${req.params.id} not found` });
    }
  };

  private changeClientData = async (
    req: Request<Stringified<Pick<Client, 'id'>>, ClientUpdateData>,
    res: Response
  ) => {
    const newData = await this.userService.changeClientData({
      id: parseInt(req.params.id),
      ...req.body
    });

    if (newData !== null) {
      res.status(200).send({ data: newData });
    } else {
      res
        .status(404)
        .send({ message: `Client with id=${req.params.id} not found` });
    }
  };

  private deleteClientData = async (
    req: Request<Stringified<Pick<Client, 'id'>>>,
    res: Response
  ) => {
    const deletedClient = await this.userService.deleteClient(
      parseInt(req.params.id)
    );

    if (deletedClient !== null) {
      res.status(200).send({ data: deletedClient });
    } else {
      res
        .status(404)
        .send({ message: `Client with id=${req.params.id} not found` });
    }
  };
}
