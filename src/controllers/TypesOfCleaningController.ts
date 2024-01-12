import { Frequency } from '@prisma/client';
import type { Response } from 'express';
import { Stringified } from 'type-fest';

import { ServicesWorkingHoursOptions } from '~/schemas/employee';
import type {
  ChangeServiceData,
  CreateServiceData
} from '~/schemas/typesOfCleaning';

import { checkIsAdmin } from '~/middlewares/auth/checkAuthorization';
import {
  validateServiceChangeData,
  validateServiceCreationData
} from '~/middlewares/type-validators/typesOfCleaning';

import { TypesOfCleaningService } from '~/services';

import { AllServicesQueryOptions } from '~/services/TypesOfCleaningService';

import { queryParamToBoolean } from '~/utils/general';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

type GetServiceByIdQueryParams = {
  includeSecondaryServices?: string;
  includePrimaryServices?: string;
  includeCleaningFrequencies?: string;
};
export default class TypesOfCleaningController extends AbstractController {
  private typesOfCleaningService = new TypesOfCleaningService();

  constructor() {
    super('/services');
    this.createRoutes();
  }

  public createRoutes() {
    this.router.get('/', this.getAllServices);
    this.router.post(
      '/',
      checkIsAdmin(),
      validateServiceCreationData(),
      this.createService
    );
    this.router.get('/busy-hours', this.getAllServicesBusyHours);
    this.router.get('/:id', this.getServiceById);
    this.router.put(
      '/:id',
      checkIsAdmin(),
      validateServiceChangeData(),
      this.changeServicePrice
    );
    // this.router.delete('/:id', checkIsAdmin(), this.deleteService);
  }

  private getAllServices = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<AllServicesQueryOptions>
    >,
    res: Response
  ) => {
    try {
      const services = await this.typesOfCleaningService.getAllServices({
        primaryOnly: queryParamToBoolean(req.query.primaryOnly),
        includeEmployees: queryParamToBoolean(req.query.includeEmployees)
      });
      res.status(200).send(services);
    } catch (err) {
      console.error(err);
      res.status(400).send({ message: 'Error when fetching all services' });
    }
  };

  private getServiceById = async (
    req: TypedRequest<
      { id: string },
      DefaultBodyType,
      GetServiceByIdQueryParams
    >,
    res: Response
  ) => {
    try {
      const service = await this.typesOfCleaningService.getServiceById(
        parseInt(req.params.id)
      );

      if (service !== null) {
        res.status(200).send(service);
      } else {
        res
          .status(404)
          .send({ message: `Service with id=${req.params.id} not found` });
      }
    } catch (err) {
      console.error(err);
      res.status(400).send({ message: 'Error when fetching service by id' });
    }
  };

  private createService = async (
    req: TypedRequest<DefaultParamsType, CreateServiceData>,
    res: Response
  ) => {
    const data = req.body;
    try {
      const service = await this.typesOfCleaningService.createService(data);
      res.status(201).send(service);
    } catch (err) {
      res.status(400).send({ message: 'Error when creating a new service' });
    }
  };

  private changeServicePrice = async (
    req: TypedRequest<{ id: string }, ChangeServiceData>,
    res: Response
  ) => {
    const { unit } = req.body;

    try {
      const service = await this.typesOfCleaningService.changeServicePrice(
        parseInt(req.params.id),
        {
          unit
        }
      );

      res.status(200).send(service);
    } catch (err) {
      res.status(400).send({ message: "Error when changing service's price" });
    }
  };

  private getAllServicesBusyHours = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<ServicesWorkingHoursOptions>
    >,
    res: Response
  ) => {
    try {
      const services =
        await this.typesOfCleaningService.getAllServicesBusyHours({
          period: req.query.period,
          serviceIds: req.query.serviceIds
            ? req.query.serviceIds.split(',').map((id) => parseInt(id))
            : undefined,
          frequency: req.query.frequency as Frequency | undefined,
          excludeFrom: req.query.excludeFrom,
          excludeTo: req.query.excludeTo
        });

      res.status(200).send(services);
    } catch (err) {
      res.status(400).send({
        message: `Error when fetching all services busy hours`
      });
    }
  };

  // not used yet
  // private deleteService = async (
  //   req: TypedRequest<{ id: string }>,
  //   res: Response
  // ) => {
  //   try {
  //     const service = await this.typesOfCleaningService.deleteService(
  //       parseInt(req.params.id)
  //     );

  //     if (service === null) {
  //       res
  //         .status(404)
  //         .send({ message: `Service with id=${req.params.id} not found` });
  //     }
  //     return res.status(200).send(service);
  //   } catch (err) {
  //     res.status(400).send({ message: 'Error when deleting service' });
  //   }
  // };
}
