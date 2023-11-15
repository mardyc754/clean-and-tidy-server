import { type Employee, type Service } from '@prisma/client';

import { prisma } from '~/db';

import {
  ChangeServicePriceData,
  CreateServiceData,
  PrimarySecondaryIds
} from '~/schemas/typesOfCleaning';

import { getResponseServiceData } from '~/utils/services';

import {
  executeDatabaseOperation,
  includeWithOtherDataIfTrue
} from '../utils/queryUtils';

type AllServicesQueryOptions = {
  primaryOnly: boolean;
};

type ServiceQueryOptions = {
  includeSecondaryServices: boolean;
  includePrimaryServices: boolean;
  includeCleaningFrequencies: boolean;
};

export default class TypesOfCleaningService {
  public async getServiceById(
    id: Service['id'],
    options?: ServiceQueryOptions
  ) {
    const service = await executeDatabaseOperation(
      prisma.service.findUnique({
        where: { id },
        include: {
          ...includeWithOtherDataIfTrue(
            'primaryServices',
            'unit',
            options?.includePrimaryServices
          ),
          ...includeWithOtherDataIfTrue(
            'secondaryServices',
            'unit',
            options?.includeSecondaryServices
          ),
          cleaningFrequencies: options?.includeCleaningFrequencies
            ? {
                select: { name: true, value: true }
              }
            : undefined,
          unit: true
        }
      })
    );

    if (!service) {
      return null;
    }

    return getResponseServiceData(service);
  }

  public async getAllServices(options?: AllServicesQueryOptions) {
    const services = await executeDatabaseOperation(
      prisma.service.findMany({
        ...(options?.primaryOnly ? { where: { isPrimary: true } } : {}),
        include: {
          unit: true
        }
      })
    );

    if (!services) {
      return null;
    }

    return services.map((service) => getResponseServiceData(service));
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
