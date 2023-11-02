import type { Request, Response } from 'express';

import { VisitService } from '~/services';

import { DefaultParamsType, TypedRequest } from '~/types';
import {
  ChangeVisitDateData,
  ChangeVisitStatusData,
  SingleVisitCreationData
} from '~/schemas/visit';
import {
  validateVisitDate,
  validateVisitStatus,
  validateVisitCreationData
} from '~/middlewares/type-validators/visit';

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
    this.router.put('/:id/date', validateVisitDate(), this.changeDate);
    this.router.delete('/:id', this.deleteVisit);
    this.router.put('/:id/status', validateVisitStatus(), this.changeStatus);
  }

  private getAllVisits = async (_: Request, res: Response) => {
    const visits = await this.visitService.getAllVisits();

    if (visits !== null) {
      res.status(200).send({
        data: visits
      });
    } else {
      res.status(400).send({ message: 'Error when receiving all visits' });
    }
  };

  private getVisitById = async (
    req: Request<{ id: string }>,
    res: Response
  ) => {
    const visit = await this.visitService.getVisitById(parseInt(req.params.id));

    if (visit) {
      res.status(200).send({
        data: visit
      });
    } else {
      res.status(404).send({ message: 'Visit not found' });
    }
  };

  private createVisit = async (
    req: TypedRequest<DefaultParamsType, SingleVisitCreationData>,
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

  private changeDate = async (
    req: TypedRequest<{ id: string }, ChangeVisitDateData>,
    res: Response
  ) => {
    const visit = await this.visitService.changeVisitDate({
      ...req.body,
      id: parseInt(req.params.id)
    });

    if (visit) {
      res.status(200).send({
        data: visit
      });
    } else {
      res.status(400).send({ message: 'Error when updating visit data' });
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

  // this should be protected
  private changeStatus = async (
    req: TypedRequest<{ id: string }, ChangeVisitStatusData>,
    res: Response
  ) => {
    const visit = await this.visitService.changeVisitStatus(
      parseInt(req.params.id),
      req.body.status
    );

    if (visit) {
      res.status(200).send({
        ...visit
      });
    } else {
      res
        .status(400)
        .send({ message: "Error when confirm visit's status  change" });
    }
  };
}