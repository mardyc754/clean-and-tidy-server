import type { Client, Status } from '@prisma/client';
import type { Request, Response } from 'express';
import type { Stringified } from 'type-fest';

import { CreateAnonymousClientData } from '~/schemas/client';

import { checkIfUserExisits } from '~/middlewares/auth/checkIfUserExists';
import { validateCreateAnonymousClientData } from '~/middlewares/type-validators/client';

import { ClientService } from '~/services';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class ClientController extends AbstractController {
  private clientService = new ClientService();

  constructor() {
    super('/clients');
    this.createRoutes();
  }

  public createRoutes() {
    this.router.post(
      '/',
      validateCreateAnonymousClientData(),
      checkIfUserExisits,
      this.createAnonymousClient
    );
    this.router.get('/:id', this.getClientById);
    this.router.get(
      '/:id/reservations',
      // checkAccessToClientData(),
      this.getClientReservations
    );
  }

  private createAnonymousClient = async (
    req: TypedRequest<DefaultParamsType, CreateAnonymousClientData>,
    res: Response
  ) => {
    try {
      const { email } = req.body;

      const user = await this.clientService.createClient({ email });

      res.status(201).send(user);
    } catch (error) {
      res.status(400).send({ message: 'Error when creating new user' });
    }
  };

  private getClientById = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    try {
      const user = await this.clientService.getClientById(
        parseInt(req.params.id)
      );

      res.status(200).send(user);
    } catch (error) {
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
    try {
      const reservations = await this.clientService.getClientReservations(
        parseInt(req.params.id),
        req.query.status as Status | undefined
      );

      if (reservations !== null) {
        return res.status(200).send(reservations);
      } else {
        return res
          .status(404)
          .send({ message: `Client with id=${req.params.id} not found` });
      }
    } catch (error) {
      res
        .status(400)
        .send({ message: 'Error when finding client reservations' });
    }
  };
}
