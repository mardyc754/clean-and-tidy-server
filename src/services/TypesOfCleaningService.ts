import { type Service } from '@prisma/client';
import { omit } from 'lodash';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import type {
  EmployeeWorkingHoursQueryOptions,
  ServicesWorkingHoursOptions
} from '~/schemas/employee';
import {
  ChangeServicePriceData,
  CreateServiceData,
  PrimarySecondaryIds
} from '~/schemas/typesOfCleaning';

import {
  getSingleServiceData,
  selectEmployee,
  serviceEmployees,
  serviceUnit,
  visitPartTimeframe
} from '~/queries/serviceQuery';

import {
  calculateBusyHours,
  getEmployeeWithWorkingHours,
  mergeBusyHours
} from '~/utils/employeeUtils';
import { getResponseServiceData } from '~/utils/services';

import { executeDatabaseOperation } from '../utils/queryUtils';

export type AllServicesQueryOptions = {
  primaryOnly: boolean;
  includeEmployees: boolean;
};

export type ServiceQueryOptions = {
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
      prisma.service.findUnique(getSingleServiceData(id, options))
    );

    if (!service) {
      return null;
    }

    return getResponseServiceData(service);
  }

  public async getAllServices(options?: AllServicesQueryOptions) {
    const services = options?.includeEmployees
      ? await executeDatabaseOperation(
          prisma.service.findMany({
            where: options?.primaryOnly ? { isPrimary: true } : undefined,
            include: {
              ...serviceUnit,
              employees: serviceEmployees
            }
          })
        )
      : await executeDatabaseOperation(
          prisma.service.findMany({
            where: options?.primaryOnly ? { isPrimary: true } : undefined,
            include: {
              ...serviceUnit
            }
          })
        );

    return services?.map((service) => getResponseServiceData(service));
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

  public async getServiceBusyHours(
    id: Service['id'],
    options?: EmployeeWorkingHoursQueryOptions
  ) {
    const service = await executeDatabaseOperation(
      prisma.service.findUnique({
        where: {
          id
        },
        include: {
          employees: {
            select: {
              employee: selectEmployee,
              visitParts: visitPartTimeframe(options)
            }
          }
        }
      })
    );

    const employeesWithWorkingHours =
      service?.employees.map((employee) =>
        getEmployeeWithWorkingHours(employee)
      ) ?? [];

    return service
      ? {
          ...omit(service, 'employees'),
          busyHours: calculateBusyHours(
            employeesWithWorkingHours.map((employee) => employee.workingHours)
          )
        }
      : null;
  }

  public async getAllServicesBusyHours(options?: ServicesWorkingHoursOptions) {
    const services = await executeDatabaseOperation(
      prisma.service.findMany({
        where: {
          id: { in: options?.serviceIds }
        },
        include: {
          employees: {
            select: {
              employee: selectEmployee,
              visitParts: visitPartTimeframe(options)
            }
          }
        }
      })
    );

    if (!services) {
      return null;
    }

    const servicesWithEmployees = services.map((service) => ({
      ...omit(service, 'employees'),
      employees: service.employees.map((employee) =>
        getEmployeeWithWorkingHours(employee)
      )
    }));

    const allEmployeesBusyHours = servicesWithEmployees.map((service) =>
      calculateBusyHours(
        service.employees.map((employee) => employee.workingHours)
      )
    );

    // console.log('allEmployeesBusyHours', allEmployeesBusyHours);
    return mergeBusyHours(allEmployeesBusyHours);

    // return servicesWithEmployees.map((service) => ({
    //   ...omit(service, 'employees'),
    //   busyHours: calculateBusyHours(
    //     service.employees.map((employee) => employee.workingHours)
    //   )
    // }));
  }
}
