import type { Response } from 'express';

import { checkIsEmployee } from '~/middlewares/auth/checkAuthorization';

import { VisitPartService } from '~/services';

import { TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class VisitPartController extends AbstractController {
  private readonly visitPartService = new VisitPartService();

  constructor() {
    super('/visit-parts');
    this.createRoutes();
  }

  public createRoutes() {
    this.router.get('/:id', this.getVisitPartById);
    this.router.put('/:id/cancel', checkIsEmployee(), this.cancelVisitPart);
  }

  private getVisitPartById = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    try {
      const visitPart = await this.visitPartService.getVisitPartById(
        parseInt(req.params.id)
      );

      if (!visitPart) {
        return res
          .status(404)
          .send({ message: `Visit part with id=${req.params.id} not found` });
      }

      return res.status(200).send(visitPart);
    } catch (error) {
      res.status(400).send({ message: `Error when getting visit part by id` });
    }
  };

  private cancelVisitPart = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    try {
      const visitPart = await this.visitPartService.cancelVisitPart(
        parseInt(req.params.id)
      );

      if (!visitPart) {
        return res
          .status(404)
          .send({ message: `Visit part with id=${req.params.id} not found` });
      }

      res.status(200).send(visitPart);
    } catch (error) {
      res.status(400).send({ message: `Error when cancelling visit part` });
    }
  };
}
