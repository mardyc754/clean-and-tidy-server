import { type Employee, Prisma, type Service } from '@prisma/client';
import { omit } from 'lodash';
import { OverrideProperties } from 'type-fest';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import { EmployeeWorkingHoursQueryOptions } from '~/schemas/employee';
import {
  ChangeServicePriceData,
  CreateServiceData,
  PrimarySecondaryIds
} from '~/schemas/typesOfCleaning';

import {
  getAllServicesData,
  getServiceEmployees,
  getSingleServiceData,
  serviceEmployees,
  serviceUnit
} from '~/queries/serviceQuery';

import { calculateBusyHours } from '~/utils/employeeUtils';
import { getResponseServiceData } from '~/utils/services';

import {
  executeDatabaseOperation,
  includeWithOtherDataIfTrue
} from '../utils/queryUtils';

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

  // TODO FIXME: this is not working
  public async getServiceBusyHours(
    id: Service['id'],
    options?: EmployeeWorkingHoursQueryOptions
  ) {
    // const employeesWithVisits = await executeDatabaseOperation(
    // prisma.employee.findMany({
    //   where: {
    //     services: {
    //       some: {
    //         // id: { in: [1, 2] }
    //         id
    //       }
    //     }
    //   },
    //   select: {
    //     ...prismaExclude('Employee', ['password']),
    //     visits: {
    //       where: {
    //         visit: {
    //           startDate: {
    //             gte: options?.from ? new Date(options?.from) : undefined
    //           },
    //           endDate: {
    //             lte: options?.to ? new Date(options?.to) : undefined
    //           }
    //         }
    //       },
    //       orderBy: {
    //         visit: {
    //           startDate: 'asc'
    //         }
    //       },
    //       select: {
    //         visit: {
    //           select: {
    //             startDate: true,
    //             endDate: true
    //           }
    //         }
    //       }
    //     }
    //   }
    // })
    //   prisma.service.findUnique({
    //     where: { id },
    //     select: {
    //       employees: {
    //         select: {
    //           ...prismaExclude('Employee', ['password']),
    //           visits: {
    //             where: {
    //               visit: {
    //                 startDate: {
    //                   gte: options?.from ? new Date(options?.from) : undefined
    //                 },
    //                 endDate: {
    //                   lte: options?.to ? new Date(options?.to) : undefined
    //                 }
    //               }
    //             },
    //             orderBy: {
    //               visit: {
    //                 startDate: 'asc'
    //               }
    //             },
    //             select: {
    //               visit: {
    //                 select: {
    //                   startDate: true,
    //                   endDate: true,
    //                   reservation: {
    //                     select: {
    //                       services: true
    //                     }
    //                   }
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   })
    // );
    // if (!employeesWithVisits) {
    //   return null;
    // }
    // return employeesWithVisits.employees;
    // const visitTimespans = employeesWithVisits.map((employee) => ({
    //   // employee.visits.flatMap((visit) => ({
    //   //   startDate: visit.visit.startDate,
    //   //   endDate: visit.visit.endDate
    //   // }))
    //   ...omit(employee, ['visits']),
    //   workingHours: employee.visits.flatMap(({ visit }) => ({
    //     start: visit.startDate,
    //     end: visit.endDate
    //   }))
    // }));
    // return visitTimespans;
    // return calculateBusyHours(
    //   employeesWithWorkingHours?.map(({ workingHours }) => workingHours) ?? []
    // );
    return null;
  }
}
