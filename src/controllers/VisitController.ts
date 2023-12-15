import type { Request, Response } from 'express';
import { Stringified } from 'type-fest';

import {
  ChangeVisitData,
  ChangeVisitStatusData,
  VisitPartCreationData
} from '~/schemas/visit';

import {
  validateVisitCreationData,
  validateVisitDate,
  validateVisitStatus
} from '~/middlewares/type-validators/visit';

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
    this.router.put('/:id/status', validateVisitStatus(), this.changeStatus);
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
    const visit = await this.visitService.getVisitPartById(
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
    const visit = await this.visitService.changeVisitData({
      ...req.body,
      id: parseInt(req.params.id)
    });

    if (visit) {
      res.status(200).send(visit);
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
      req.body.employeeId,
      req.body.status
    );

    if (visit) {
      // res.status(200).send({
      //   ...visit
      // });
      res.status(200).send(visit);
    } else {
      res
        .status(400)
        .send({ message: "Error when confirm visit's status  change" });
    }
  };
}
