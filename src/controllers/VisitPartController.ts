import type { Response } from 'express';

import { Scheduler } from '~/lib/Scheduler';

import { VisitPartService } from '~/services';

import { TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class VisitPartController extends AbstractController {
  private readonly visitPartService = new VisitPartService();
  private readonly scheduler = Scheduler.getInstance();

  constructor() {
    super('/visit-parts');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/:id', this.getVisitPartById);
    this.router.put('/:id/cancel', this.cancelVisitPart);
  }

  private getVisitPartById = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const visitPart = await this.visitPartService.getVisitPartById(
      parseInt(req.params.id)
    );

    if (visitPart) {
      res.status(200).send(visitPart);
    } else {
      res
        .status(404)
        .send({ message: `Visit part with id=${req.params.id} not found` });
    }
  };

  private cancelVisitPart = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const visitPart = await this.visitPartService.cancelVisitPart(
      parseInt(req.params.id)
    );

    if (visitPart) {
      this.scheduler.cancelVisitPartJob(visitPart.id);

      res.status(200).send(visitPart);
    } else {
      res
        .status(404)
        .send({ message: `Visit part with id=${req.params.id} not found` });
    }
  };
}
