import { Frequency, type Service } from '@prisma/client';
import { omit } from 'lodash';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import type { ServicesWorkingHoursOptions } from '~/schemas/employee';
import {
  ChangeServicePriceData,
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
  mergeBusyHours,
  numberOfWorkingHours
} from '~/utils/employeeUtils';
import {
  flattenVisitPartsToSingleRange,
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

  public async getAllServicesBusyHours(options?: ServicesWorkingHoursOptions) {
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
                ...visitPartTimeframe(options),
                select: { startDate: true, endDate: true }
              }
            }
          }
        }
      })
    );

    if (!employees) {
      return null;
    }

    const cyclicRanges = getCyclicDateRanges(options);

    // employees working hours calculation
    const employeesWithWorkingHours = employees.map((employee) => {
      // add half an hour before and after the visit
      const employeeWorkingHours = calculateEmployeeBusyHours(
        employee.services.flatMap((service) => service.visitParts)
      );

      return {
        ...employee,
        services: employee.services.map((service) => service.serviceId),
        workingHours: employeeWorkingHours,
        // for calculating the number of working hours
        // we need the working hours with added extra time
        // only before the visit
        numberOfWorkingHours: numberOfWorkingHours(
          calculateEmployeeWorkingHours(
            employee.services.flatMap((service) => service.visitParts)
          )
        )
      };
    });

    // flatten visit parts to single range
    const flattenedEmployeeVisitParts = employeesWithWorkingHours
      .map((employee) => employee.workingHours)
      .map((visitParts) => {
        const busyHoursForTimeslots = cyclicRanges.map((range, i) => {
          const { startDate, endDate } = range;

          const employeeVisitsInTimeRange = visitParts.filter(
            (visitPart) =>
              isAfterOrSame(visitPart.startDate, startDate) &&
              isBeforeOrSame(visitPart.endDate, endDate)
          );

          const { step, advanceDateCallback } = getFrequencyHelpers(
            options?.frequency as Frequency
          );

          return employeeVisitsInTimeRange.map((visitPart) => {
            // flatten visit parts to single range
            return {
              startDate: new Date(
                advanceDateCallback
                  ? (advanceDateCallback(
                      visitPart.startDate,
                      -i * step
                    ) as string)
                  : visitPart.startDate
              ),
              endDate: new Date(
                advanceDateCallback
                  ? (advanceDateCallback(
                      visitPart.endDate,
                      -i * step
                    ) as string)
                  : visitPart.endDate
              )
            };
          });
        });

        // squash visit part dates into single range
        // and merge the busy hours
        return mergeBusyHours(busyHoursForTimeslots);
      });

    return {
      employees: employeesWithWorkingHours,
      busyHours: calculateBusyHours(flattenedEmployeeVisitParts)
    };
  }
}
