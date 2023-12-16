import type { Request, Response } from 'express';
import { Stringified } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import { ChangeVisitData, VisitPartCreationData } from '~/schemas/visit';

import { validateVisitCreationData } from '~/middlewares/type-validators/visit';

import { VisitService } from '~/services';

import { VisitQueryOptions } from '~/services/VisitService';

import { queryParamToBoolean } from '~/utils/general';

import { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class VisitController extends AbstractController {
  private readonly visitService = new VisitService();

  constructor() {
    super('/visits');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllVisits); // is this needed somewhere?
    this.router.post('/', validateVisitCreationData(), this.createVisit);
    this.router.get('/:id', this.getVisitById);
    this.router.put('/:id', this.changeVisitData);
    this.router.delete('/:id', this.deleteVisit);
    this.router.put('/:id/cancel', this.cancelVisit);
  }

  private getAllVisits = async (_: Request, res: Response) => {
    const visits = await this.visitService.getAllVisits();

    if (visits !== null) {
      res.status(200).send(visits);
    } else {
      res.status(400).send({ message: 'Error when receiving all visits' });
    }
  };

  private getVisitById = async (
    req: TypedRequest<
      { id: string },
      DefaultBodyType,
      Stringified<VisitQueryOptions>
    >,
    res: Response
  ) => {
    const visit = await this.visitService.getVisitById(
      parseInt(req.params.id),
      { includeEmployee: queryParamToBoolean(req.query.includeEmployee) }
    );

    if (visit) {
      res.status(200).send(visit);
    } else {
      res.status(404).send({ message: 'Visit not found' });
    }
  };

  private createVisit = async (
    req: TypedRequest<DefaultParamsType, VisitPartCreationData>,
    res: Response
  ) => {
    const data = req.body;

    const visit = await this.visitService.createVisit(data);

    if (visit) {
      res.status(201).send({
        data: visit
      });
    } else {
      res.status(400).send({ message: 'Error when creating the visit' });
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

      if (visit) {
        return res.status(200).send(visit);
      }
      return res
        .status(400)
        .send({ message: 'Error when updating visit data' });
    } catch (error) {
      if (error instanceof RequestError) {
        return res.status(400).send({ message: error.message });
      }
      return res.status(500).send({ message: 'Unexpected error occured' });
    }
  };

  private deleteVisit = async (req: Request<{ id: string }>, res: Response) => {
    const visit = await this.visitService.deleteVisit(parseInt(req.params.id));

    if (visit) {
      res.status(200).send({
        data: visit
      });
    } else {
      res.status(400).send({ message: 'Error when deleting the visit' });
    }
  };

  private cancelVisit = async (req: Request<{ id: string }>, res: Response) => {
    const visit = await this.visitService.cancelVisit(parseInt(req.params.id));

    if (visit) {
      res.status(200).send(visit);
    } else {
      res.status(400).send({ message: 'Error when canceling the visit' });
    }
  };
}
