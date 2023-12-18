import { Frequency, type Service } from '@prisma/client';
import { omit } from 'lodash';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import type { ServicesWorkingHoursOptions } from '~/schemas/employee';
import {
  ChangeServiceData,
  CreateServiceData,
  PrimarySecondaryIds
} from '~/schemas/typesOfCleaning';

import {
  employeeData,
  getSingleServiceData,
  selectEmployee,
  serviceEmployees,
  serviceUnit,
  visitPartTimeframe
} from '~/queries/serviceQuery';

import {
  advanceDateByWeeks,
  getYearFromDate,
  isAfter,
  isAfterOrSame,
  isBeforeOrSame,
  startOfDay
} from '~/utils/dateUtils';
import {
  Timeslot,
  addBreaksToWorkingHours,
  calculateBusyHours,
  calculateEmployeeBusyHours,
  calculateEmployeeWorkingHours,
  getEmployeeWithWorkingHours,
  getEmployeesBusyHours,
  mergeBusyHours,
  numberOfWorkingHours
} from '~/utils/employeeUtils';
import {
  getCyclicDateRanges,
  getFrequencyHelpers
} from '~/utils/reservationUtils';
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
          // employees: serviceEmployees
        }
      })
    );

    if (!service) {
      return null;
    }

    return getResponseServiceData(service);
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
                ...visitPartTimeframe(
                  cyclicRanges,
                  options?.excludeFrom,
                  options?.excludeTo
                )
                // select: { startDate: true, endDate: true }
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
      getEmployeesBusyHours(employees, cyclicRanges, options);

    return {
      employees: employeesWithWorkingHours,
      busyHours: calculateBusyHours(flattenedEmployeeVisitParts)
    };
  }
}
