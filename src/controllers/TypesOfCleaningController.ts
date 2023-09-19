import type { Service } from '@prisma/client';
import type { Request, Response } from 'express';

import { TypesOfCleaningService } from '~/services';

import AbstractController from './AbstractController';

export default class TypesOfCleaningController extends AbstractController {
  private typesOfCleaningService = new TypesOfCleaningService();

  constructor() {
    super('/services');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllServices);
    this.router.post('/', this.createService);
    this.router.get('/:id', this.getServiceById);
    this.router.get('/:id/employees', this.getEmployeesOfferingService);
    this.router.put('/:id', this.changeServicePrice);
    this.router.delete('/:id', this.deleteService);
  }

  private getAllServices = async (_: Request, res: Response) => {
    const services = await this.typesOfCleaningService.getAllServices();

    if (services !== null) {
      res.status(200).send({ data: services });
    } else {
      res.status(400).send({ message: 'Error when fetching all services' });
    }
  };

  private getServiceById = async (
    req: Request<Pick<Service, 'id'>>,
    res: Response
  ) => {
    const { id } = req.params;

    const service = await this.typesOfCleaningService.getServiceById(id);

    if (service !== null) {
      res.status(200).send({ data: service });
    } else {
      res
        .status(400)
        .send({ message: 'Error when fetching single service data' });
    }
  };

  private createService = async (
    req: Request<undefined, unknown, Omit<Service, 'id'>>,
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
    req: Request<Pick<Service, 'id'>, unknown, Pick<Service, 'price'>>,
    res: Response
  ) => {
    const { price } = req.body;
    const { id } = req.params;

    const service = await this.typesOfCleaningService.changeServicePrice({
      id,
      price
    });

    if (service !== null) {
      res.status(200).send({ data: service });
    } else {
      res.status(400).send({ message: "Error when changing service's price" });
    }
  };

  private deleteService = async (
    req: Request<Pick<Service, 'id'>>,
    res: Response
  ) => {
    const { id } = req.params;

    const service = await this.typesOfCleaningService.deleteService(id);

    if (service !== null) {
      res.status(200).send({ data: service });
    } else {
      res.status(400).send({ message: 'Error when deleting service' });
    }
  };

  private getEmployeesOfferingService = async (
    req: Request<Pick<Service, 'id'>>,
    res: Response
  ) => {
    const { id } = req.params;

    const employees =
      await this.typesOfCleaningService.getEmployeesOfferingService(id);

    if (employees !== null) {
      res.status(200).send({ data: employees });
    } else {
      res
        .status(400)
        .send({ message: 'Error when fetching employees offering service' });
    }
  };
}
