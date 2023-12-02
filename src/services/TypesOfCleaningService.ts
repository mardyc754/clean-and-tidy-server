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
  isBeforeOrSame
} from '~/utils/dateUtils';
import {
  TimeInterval,
  calculateBusyHours,
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

  public async getServiceBusyHours(
    id: Service['id'],
    options?: ServicesWorkingHoursOptions
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
    const employees = await executeDatabaseOperation(
      prisma.employee.findMany({
        where: {
          services: { some: { serviceId: { in: options?.serviceIds } } }
        },
        include: {
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

    // service busy hours calculation
    // all services whenever were assigned to the employees
    // const employeeServices = employees.flatMap((employee) => employee.services);

    // const uniqueServiceIds = [
    //   ...new Set(employeeServices.map((service) => service.serviceId))
    // ];

    const cyclicRanges = getCyclicDateRanges(options);

    // calculate busy hours for each services separately
    // const servicesBusyHours = uniqueServiceIds.map((serviceId) => {
    //   // split visit parts into chunks according to the cyclic date ranges
    //   const servicesWithGivenId = employeeServices.filter(
    //     (service) => service.serviceId === serviceId
    //   );

    //   // all employees visits for the given service
    //   // each element of the array represents the visits of the single employee
    //   const employeeVisits = servicesWithGivenId.map(
    //     (service) => service.visitParts
    //   );

    //   // calculate busy hours for the timeslot by the sum of intersections of the employee busy hours
    //   // in the given timeslot
    //   const busyHoursForTimeslots = cyclicRanges.map((range, i) => {
    //     const { startDate, endDate } = range;

    //     const employeeVisitsInTimeRange = employeeVisits.map((visitParts) =>
    //       visitParts.filter(
    //         (visitPart) =>
    //           isAfterOrSame(visitPart.startDate, startDate) &&
    //           isBeforeOrSame(visitPart.endDate, endDate)
    //       )
    //     );

    //     const busyHoursForTimeslot = calculateBusyHours(
    //       employeeVisitsInTimeRange
    //     );

    //     if (
    //       !(
    //         [
    //           Frequency.ONCE_A_WEEK,
    //           Frequency.EVERY_TWO_WEEKS,
    //           Frequency.ONCE_A_MONTH
    //         ] as (Frequency | undefined)[]
    //       ).includes(options?.frequency)
    //     ) {
    //       return busyHoursForTimeslot;
    //     }

    //     const { step, advanceDateCallback } = getFrequencyHelpers(
    //       options?.frequency as Frequency
    //     );

    //     // flatten visit parts to single range
    //     return busyHoursForTimeslot.map((visitPart) => ({
    //       startDate: new Date(
    //         advanceDateCallback(visitPart.startDate, -i * step)
    //       ),
    //       endDate: new Date(advanceDateCallback(visitPart.endDate, -i * step))
    //     }));
    //   });

    //   return mergeBusyHours(busyHoursForTimeslots);
    // });

    // merge busy hours for all services
    // const mergedBusyHours = mergeBusyHours(servicesBusyHours);

    // employees working hours calculation
    const employeesWithWorkingHours = employees.map((employee) => {
      const employeeWorkingHours = employee.services.flatMap(
        (service) => service.visitParts
      );

      return {
        id: employee.id,
        services: employee.services.map((service) => service.serviceId),
        // workingHours: employeeWorkingHours,
        workingHours: mergeBusyHours([employeeWorkingHours]),
        numberOfWorkingHours: numberOfWorkingHours(employeeWorkingHours)
      };
    });

    // return {
    //   employees: employeesWithWorkingHours,
    //   busyHours: mergedBusyHours
    // };

    // employees visit parts without differentiation between services
    const employeesVisitParts = employees.map((employee) =>
      employee.services.flatMap((service) => service.visitParts)
    );

    const flattenedEmployeeVisitParts = employeesVisitParts.map(
      (visitParts) => {
        const busyHoursForTimeslots = cyclicRanges.map((range, i) => {
          const { startDate, endDate } = range;

          const employeeVisitsInTimeRange = visitParts.filter(
            (visitPart) =>
              isAfterOrSame(visitPart.startDate, startDate) &&
              isBeforeOrSame(visitPart.endDate, endDate)
          );

          if (
            !(
              [
                Frequency.ONCE_A_WEEK,
                Frequency.EVERY_TWO_WEEKS,
                Frequency.ONCE_A_MONTH
              ] as (Frequency | undefined)[]
            ).includes(options?.frequency)
          ) {
            return employeeVisitsInTimeRange;
          }

          const { step, advanceDateCallback } = getFrequencyHelpers(
            options?.frequency as Frequency
          );

          // flatten visit parts to single range
          return employeeVisitsInTimeRange.map((visitPart) => ({
            startDate: new Date(
              advanceDateCallback(visitPart.startDate, -i * step)
            ),
            endDate: new Date(advanceDateCallback(visitPart.endDate, -i * step))
          }));
        });

        return mergeBusyHours(busyHoursForTimeslots);
      }
    );

    return {
      employees: employeesWithWorkingHours,
      busyHours: calculateBusyHours(flattenedEmployeeVisitParts)
    };
  }
}
