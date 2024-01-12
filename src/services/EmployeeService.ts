import { type Employee, Frequency, Status, VisitPart } from '@prisma/client';
import { omit, without } from 'lodash';

import { prisma } from '~/lib/prisma';

import {
  EmployeeChangeData,
  type EmployeeCreationData,
  EmployeeWorkingHoursOptions
} from '~/schemas/employee';

import {
  employeeData,
  includeFullService,
  includeServiceVisitPartsAndReservation,
  includeVisitParts,
  selectEmployee,
  visitPartTimeframe
} from '~/queries/serviceQuery';

import { executeDatabaseOperation } from '~/utils/queryUtils';
import { flattenVisitPartsFromServices } from '~/utils/services';
import { getCyclicDateRanges } from '~/utils/timeslotUtils';
import { getEmployeesBusyHoursData, sumOfTimeslots } from '~/utils/timeslotUtils';
import { flattenNestedReservationServices } from '~/utils/visits';

type EmployeeReservationQueryOptions = {
  status: Status;
};

export default class EmployeeService {
  public async getEmployeeById(id: Employee['id']) {
    let employee: Omit<Employee, 'password'> | null = null;

    try {
      employee = await prisma.employee.findUnique({
        where: { id },
        ...selectEmployee
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employee;
  }

  public async getEmployeeByEmail(email: Employee['email']) {
    let employee: Employee | null = null;

    try {
      employee = await prisma.employee.findUnique({
        where: { email }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employee;
  }

  public async getAllEmployees() {
    const employees = await executeDatabaseOperation(
      prisma.employee.findMany({
        include: {
          services: includeServiceVisitPartsAndReservation
        },
        orderBy: { id: 'asc' }
      })
    );

    return employees
      ? employees.map((employee) => ({
          ...omit(employee, 'services'),
          visitParts: flattenVisitPartsFromServices(employee.services)
        }))
      : null;
  }

  public async getEmployeeVisits(employeeId: Employee['id'], status?: VisitPart['status']) {
    const visits = await executeDatabaseOperation(
      prisma.visitPart.findMany({
        where: {
          employeeId,
          status: status
        },
        ...includeVisitParts
      })
    );

    return visits
      ? visits.map((visit) => ({
          ...omit(visit, 'employeeService', 'visit'),
          reservation: visit.visit.reservation,
          service: visit.employeeService.service
        }))
      : null;
  }

  public async getReservationsAssignedToEmployee(
    id: Employee['id'],
    options?: EmployeeReservationQueryOptions
  ) {
    const reservations = await executeDatabaseOperation(
      prisma.reservation.findMany({
        where: {
          visits: { some: { visitParts: { some: { employeeId: id } } } },
          status: options?.status
        },
        include: {
          visits: {
            where: {
              visitParts: { some: { employeeId: id } }
            },
            include: {
              visitParts: { where: { employeeId: id } }
            }
          },
          services: includeFullService
        }
      })
    );

    return (
      reservations?.map((reservation) => ({
        ...reservation,
        services: flattenNestedReservationServices(reservation.services)
      })) ?? null
    );
  }

  public async getEmployeeWithServices(employeeId: Employee['id']) {
    try {
      const employeeWithServices = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          ...employeeData,
          services: includeFullService
        }
      });

      return {
        ...omit(employeeWithServices, 'services'),
        services: employeeWithServices?.services.flatMap(({ service }) => service) ?? []
      };
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
      return null;
    }
  }

  // admin only
  public async createEmployee(data: Omit<EmployeeCreationData, 'confirmPassword'>) {
    return await executeDatabaseOperation(
      prisma.employee.create({
        data: {
          ...data,
          isAdmin: false,
          services: {
            create: data.services?.map((id) => ({ serviceId: id })) ?? []
          }
        },
        ...selectEmployee
      })
    );
  }

  public async changeEmployeeData(employeeId: Employee['id'], data: Partial<EmployeeChangeData>) {
    const employeeServices = await this.getEmployeeWithServices(employeeId);

    const serviceIds = data.services ?? [];

    if (employeeServices === null) {
      return null;
    }

    const employeeServicesIds = employeeServices.services.map((service) => service.id);
    const removedServiceIds = without(employeeServicesIds, ...serviceIds);
    const createdServiceIds = without(serviceIds, ...employeeServicesIds);

    try {
      const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          isAdmin: data.isAdmin ?? false,
          services: {
            deleteMany: removedServiceIds.map((id) => ({ serviceId: id })),
            createMany: {
              data: createdServiceIds.map((id) => ({ serviceId: id }))
            }
          }
        },
        ...selectEmployee
      });

      return updatedEmployee;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return null;
  }

  public async getEmployeesBusyHoursForVisit(options?: EmployeeWorkingHoursOptions) {
    const periodParams = options?.period?.split('-');
    // not sure if there should be added 1 to the month
    // in order not to count it from 0
    const year = periodParams?.[0] ? parseInt(periodParams[0]) : undefined;
    const month = periodParams?.[1] ? parseInt(periodParams[1]) : undefined;

    const cyclicRanges = getCyclicDateRanges(year, month, options?.frequency);

    const employees = await executeDatabaseOperation(
      prisma.employee.findMany({
        where: {
          services: {
            some: {
              visitParts: {
                some: { visitId: { in: options?.visitIds } }
              }
            }
          }
        },
        select: {
          ...employeeData,
          services: {
            include: {
              visitParts: {
                ...visitPartTimeframe(cyclicRanges, options?.excludeFrom, options?.excludeTo)
              }
            }
          }
        }
      })
    );

    if (!employees) {
      return null;
    }

    const { employeesWithWorkingHours, flattenedEmployeeVisitParts } = getEmployeesBusyHoursData(
      employees,
      cyclicRanges,
      options?.frequency
    );

    return {
      employees: employeesWithWorkingHours,
      busyHours: sumOfTimeslots(flattenedEmployeeVisitParts)
    };
  }
}
