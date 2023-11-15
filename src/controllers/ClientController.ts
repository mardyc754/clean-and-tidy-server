import type { Client, Status } from '@prisma/client';
import type { Request, Response } from 'express';
import { omit } from 'lodash';
import type { Stringified } from 'type-fest';

import { ClientUpdateData, CreateAnonymousClientData } from '~/schemas/client';

import { checkAccessToClientData } from '~/middlewares/auth/checkRole';
import {
  validateClientUpdateData,
  validateCreateAnonymousClientData
} from '~/middlewares/type-validators/client';

import { ClientService, EmployeeService } from '~/services';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class ClientController extends AbstractController {
  private userService = new ClientService();
  private employeeService = new EmployeeService();

  constructor() {
    super('/clients');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllClients);
    this.router.post(
      '/',
      validateCreateAnonymousClientData(),
      this.createAnonymousClient
    );
    this.router.get('/:id', this.getClientById);
    this.router.get(
      '/:id/reservations',
      // checkAccessToClientData(),
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

  private createAnonymousClient = async (
    req: TypedRequest<DefaultParamsType, CreateAnonymousClientData>,
    res: Response
  ) => {
    const { email } = req.body;

    let userExists =
      Boolean(await this.userService.getClientByEmail(email)) ||
      Boolean(await this.employeeService.getEmployeeByEmail(email));

    if (userExists) {
      return res.status(409).send({
        message: 'The user with given email already exists'
      });
    }

    const user = await this.userService.createClient({ email });

    if (user) {
      res.status(201).send({
        data: user
      });
    } else {
      res
        .status(400)
        .send({ message: 'Error when creating new user', hasError: true });
    }
  };

  private getClientById = async (
    req: TypedRequest<{ id: string }>,
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
      { status?: Status }
    >,
    res: Response
  ) => {
    const reservations = await this.userService.getClientReservations(
      parseInt(req.params.id),
      req.query.status as Status | undefined
    );

    if (reservations !== null) {
      res.status(200).send(reservations);
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
