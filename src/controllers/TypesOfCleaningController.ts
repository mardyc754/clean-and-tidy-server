import { Frequency } from '@prisma/client';
import type { Response } from 'express';
import { Stringified } from 'type-fest';

import { ServicesWorkingHoursOptions } from '~/schemas/employee';
import type {
  ChangeServicePriceData,
  CreateServiceData
} from '~/schemas/typesOfCleaning';

import { validateServiceCreationData } from '~/middlewares/type-validators/typesOfCleaning';

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
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllServices);
    this.router.post('/', validateServiceCreationData(), this.createService);
    this.router.get('/busy-hours', this.getAllServicesBusyHours);
    this.router.get('/:id', this.getServiceById);
    this.router.put('/:id', this.changeServicePrice);
    this.router.delete('/:id', this.deleteService);
    this.router.post(
      '/:primaryServiceId/connect/:secondaryServiceId',
      this.linkPrimaryAndSecondaryService
    );
  }

  private getAllServices = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<AllServicesQueryOptions>
    >,
    res: Response
  ) => {
    const services = await this.typesOfCleaningService.getAllServices({
      primaryOnly: queryParamToBoolean(req.query.primaryOnly),
      includeEmployees: queryParamToBoolean(req.query.includeEmployees)
    });

    if (services !== null) {
      res.status(200).send(services);
    } else {
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
    const service = await this.typesOfCleaningService.getServiceById(
      parseInt(req.params.id),
      {
        includeSecondaryServices: queryParamToBoolean(
          req.query.includeSecondaryServices
        ),
        includePrimaryServices: queryParamToBoolean(
          req.query.includePrimaryServices
        ),
        includeCleaningFrequencies: queryParamToBoolean(
          req.query.includeCleaningFrequencies
        )
      }
    );

    if (service !== null) {
      res.status(200).send(service);
    } else {
      res
        .status(400)
        .send({ message: 'Error when fetching single service data' });
    }
  };

  private createService = async (
    req: TypedRequest<DefaultParamsType, CreateServiceData>,
    res: Response
  ) => {
    const data = req.body;
    const service = await this.typesOfCleaningService.createService(data);

    if (service !== null) {
      res.status(201).send({ data: service });
    } else {
      res.status(400).send({ message: 'Error when creating a new service' });
    }
  };

  private changeServicePrice = async (
    req: TypedRequest<{ id: string }, Pick<ChangeServicePriceData, 'price'>>,
    res: Response
  ) => {
    const { price } = req.body;

    const service = await this.typesOfCleaningService.changeServicePrice({
      id: parseInt(req.params.id),
      price
    });

    if (service !== null) {
      res.status(200).send({ data: service });
    } else {
      res.status(400).send({ message: "Error when changing service's price" });
    }
  };

  private deleteService = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const service = await this.typesOfCleaningService.deleteService(
      parseInt(req.params.id)
    );

    if (service !== null) {
      res.status(200).send({ data: service });
    } else {
      res.status(400).send({ message: 'Error when deleting service' });
    }
  };

  private linkPrimaryAndSecondaryService = async (
    req: TypedRequest<{ primaryServiceId: string; secondaryServiceId: string }>,
    res: Response
  ) => {
    const { primaryServiceId, secondaryServiceId } = req.params;
    const primaryService =
      await this.typesOfCleaningService.linkPrimaryAndSecondaryService({
        primaryServiceId: parseInt(primaryServiceId),
        secondaryServiceId: parseInt(secondaryServiceId)
      });

    if (primaryService !== null) {
      res.status(200).send({ ...primaryService });
    } else {
      res
        .status(400)
        .send({ message: 'Error when linking primary and secondary service' });
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
    const services = await this.typesOfCleaningService.getAllServicesBusyHours({
      from: req.query.from,
      to: req.query.to,
      serviceIds: req.query.serviceIds
        ? req.query.serviceIds.split(',').map((id) => parseInt(id))
        : undefined,
      frequency: req.query.frequency as Frequency | undefined
    });

    if (services) {
      res.status(200).send(services);
    } else {
      res.status(404).send({
        message: `Services not found`
      });
    }
  };
}
