import { type Employee, type Service } from '@prisma/client';

import { prisma } from '~/db';
import {
  ChangeServicePriceData,
  CreateServiceData,
  PrimarySecondaryIds
} from '~/schemas/typesOfCleaning';
import { executeDatabaseOperation } from './utils';

type ServiceQueryOptions = {
  includeSecondaryServices: boolean;
  includePrimaryServices: boolean;
};
export default class TypesOfCleaningService {
  public async getServiceById(
    id: Service['id'],
    options?: ServiceQueryOptions
  ) {
    return await executeDatabaseOperation(
      prisma.service.findUnique({
        where: { id },
        include: {
          primaryServices: options?.includePrimaryServices,
          secondaryServices: options?.includeSecondaryServices
        }
      })
    );
  }

  public async getAllServices() {
    return await executeDatabaseOperation(prisma.service.findMany());
  }

  public async getEmployeesOfferingService(id: Service['id']) {
    let employees: Employee[] | null = null;

    try {
      employees = await prisma.service
        .findUnique({
          where: { id },
          include: {
            employees: true
          }
        })
        .then((service) => service?.employees ?? []);
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employees;
  }

  // admin only
  public async createService(data: CreateServiceData) {
    const { unit, ...otherData } = data;

    const unitCreationQuery = unit
      ? {
          unit: {
            create: unit
          }
        }
      : {};

    return await executeDatabaseOperation(
      prisma.service.create({
        data: {
          ...otherData,
          ...unitCreationQuery
        }
      })
    );
  }

  // admin only
  public async changeServicePrice(data: ChangeServicePriceData) {
    const { id, price } = data;
    return await executeDatabaseOperation(
      prisma.service.update({
        where: { id },
        data: {
          unit: {
            update: { price }
          }
        }
      })
    );
  }

  public async linkPrimaryAndSecondaryService(data: PrimarySecondaryIds) {
    const { primaryServiceId, secondaryServiceId } = data;

    // await executeDatabaseOperation(
    //   prisma.service.update({
    //     where: { id: secondaryServiceId },
    //     data: {
    //       // primaryService: {
    //       //   connect: { id: primaryServiceId }
    //       // },
    //       primaryServices: {
    //         connect: { id: primaryServiceId }
    //       }
    //     }
    //   })
    // );

    return await executeDatabaseOperation(
      prisma.service.update({
        where: { id: primaryServiceId },
        data: {
          secondaryServices: {
            connect: { id: secondaryServiceId }
          }
        },
        include: {
          secondaryServices: true
          // primaryServices: true
        }
      })
    );
  }

  // admin only
  public async deleteService(id: Service['id']) {
    console.log({ id });
    let service: Service | null = null;

    try {
      service = await prisma.service.delete({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return service;
  }
}
