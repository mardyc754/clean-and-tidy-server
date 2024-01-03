import { type Service } from '@prisma/client';

import prisma from '~/lib/prisma';

import type { ServicesWorkingHoursOptions } from '~/schemas/employee';
import {
  ChangeServiceData,
  CreateServiceData
} from '~/schemas/typesOfCleaning';

import {
  employeeData,
  getSingleServiceData,
  serviceEmployees,
  serviceUnit,
  visitPartTimeframe
} from '~/queries/serviceQuery';

import { getResponseServiceData } from '~/utils/services';
import { getCyclicDateRanges } from '~/utils/timeslotUtils';
import {
  getEmployeesBusyHoursData,
  timeslotsIntersection
} from '~/utils/timeslotUtils';

import { executeDatabaseOperation } from '../utils/queryUtils';

export type AllServicesQueryOptions = {
  primaryOnly: boolean;
  includeEmployees: boolean;
};

export default class TypesOfCleaningService {
  public async getServiceById(id: Service['id']) {
    const service = await executeDatabaseOperation(
      prisma.service.findUnique(getSingleServiceData(id))
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
    const { unit, secondaryServices, ...otherData } = data;

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
          ...unitCreationQuery,
          secondaryServices: {
            connect: secondaryServices?.map((id) => ({ id })) ?? []
          }
        }
      })
    );
  }

  // admin only
  public async changeServicePrice(id: Service['id'], data: ChangeServiceData) {
    const {
      unit: { price }
    } = data;
    const service = await executeDatabaseOperation(
      prisma.service.update({
        where: { id },
        data: {
          unit: {
            update: { price }
          }
        },
        include: {
          ...serviceUnit
        }
      })
    );

    if (!service) {
      return null;
    }

    return getResponseServiceData(service);
  }

  public async getAllServicesBusyHours(options?: ServicesWorkingHoursOptions) {
    const periodParams = options?.period?.split('-');

    const year = periodParams?.[0] ? parseInt(periodParams[0]) : undefined;
    const month = periodParams?.[1] ? parseInt(periodParams[1]) : undefined;

    const cyclicRanges = getCyclicDateRanges(year, month, options?.frequency);

    const employees = await executeDatabaseOperation(
      prisma.employee.findMany({
        where: {
          services: { some: { serviceId: { in: options?.serviceIds } } }
        },
        select: {
          ...employeeData,
          services: {
            include: {
              visitParts: {
                ...visitPartTimeframe(cyclicRanges)
              }
            }
          }
        }
      })
    );

    if (!employees) {
      return null;
    }

    const { employeesWithWorkingHours, flattenedEmployeeVisitParts } =
      getEmployeesBusyHoursData(employees, cyclicRanges, options?.frequency);

    return {
      employees: employeesWithWorkingHours,
      busyHours: timeslotsIntersection(flattenedEmployeeVisitParts)
    };
  }
}
