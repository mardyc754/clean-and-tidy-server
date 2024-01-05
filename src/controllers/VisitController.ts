import type { Request, Response } from 'express';
import { Stringified } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import { ChangeVisitData } from '~/schemas/visit';

import { VisitService } from '~/services';

import { VisitQueryOptions } from '~/services/VisitService';

import { DefaultBodyType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class VisitController extends AbstractController {
  private readonly visitService = new VisitService();

  constructor() {
    super('/visits');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/:id', this.getVisitById);
    this.router.put('/:id', this.changeVisitData);
    this.router.put('/:id/cancel', this.cancelVisit);
  }

  private getVisitById = async (
    req: TypedRequest<
      { id: string },
      DefaultBodyType,
      Stringified<VisitQueryOptions>
    >,
    res: Response
  ) => {
    try {
      const visit = await this.visitService.getVisitById(
        parseInt(req.params.id)
      );

      res.status(200).send(visit);
    } catch (error) {
      res.status(404).send({ message: 'Visit not found' });
    }
  };

  private changeVisitData = async (
    req: TypedRequest<{ id: string }, Pick<ChangeVisitData, 'startDate'>>,
    res: Response
  ) => {
    try {
      const visit = await this.visitService.changeVisitData({
        ...req.body,
        id: parseInt(req.params.id)
      });

      if (!visit) {
        return res
          .status(404)
          .send({ message: 'Visit with given id not found' });
      }

      return res.status(200).send(visit);
    } catch (error) {
      if (error instanceof RequestError) {
        return res.status(400).send({ message: error.message });
      }
      return res.status(500).send({ message: 'Unexpected error occured' });
    }
  };

  private cancelVisit = async (req: Request<{ id: string }>, res: Response) => {
    try {
      const visit = await this.visitService.cancelVisit(
        parseInt(req.params.id)
      );

      if (!visit) {
        return res.status(404).send({ message: 'Visit not found' });
      }

      res.status(200).send(visit);
    } catch (error) {
      res.status(400).send({ message: 'Error when canceling the visit' });
    }
  };
}
