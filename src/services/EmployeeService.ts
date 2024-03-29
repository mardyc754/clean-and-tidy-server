import { type Employee, Status, VisitPart } from '@prisma/client';
import { omit, without } from 'lodash';

import prisma from '~/lib/prisma';

import {
  EmployeeChangeData,
  type EmployeeCreationData,
  EmployeeWorkingHoursOptions
} from '~/schemas/employee';

import {
  employeeData,
  includeServiceVisitPartsAndReservation,
  includeVisitParts,
  selectEmployee,
  serviceWithUnit,
  visitPartTimeframe
} from '~/queries/serviceQuery';

import { getCyclicDateRanges } from '~/utils/timeslotUtils';
import {
  getEmployeesBusyHoursData,
  sumOfTimeslots
} from '~/utils/timeslotUtils';
import { flattenNestedReservationServices } from '~/utils/visits';

type EmployeeReservationQueryOptions = {
  status: Status;
};

export default class EmployeeService {
  public async getEmployeeById(id: Employee['id']) {
    return await prisma.employee.findUnique({
      where: { id },
      ...selectEmployee
    });
  }

  public async getEmployeeByEmail(email: Employee['email']) {
    return await prisma.employee.findUnique({
      where: { email }
    });
  }

  public async getAllEmployees() {
    const employees = await prisma.employee.findMany({
      ...includeServiceVisitPartsAndReservation,
      orderBy: { id: 'asc' }
    });

    return employees.map((employee) => ({
      ...omit(employee, 'services', 'password'),
      visitParts: employee.visitParts.map((visitPart) => ({
        ...omit(visitPart, 'visit'),
        reservation: visitPart.visit.reservation,
        service: visitPart.service
      }))
    }));
  }

  public async getEmployeeVisitParts(
    employeeId: Employee['id'],
    status?: VisitPart['status']
  ) {
    const visits = await prisma.visitPart.findMany({
      where: {
        employeeId,
        status: status
      },
      ...includeVisitParts
    });

    return visits.map((visit) => ({
      ...omit(visit, 'employeeService', 'visit'),
      reservation: visit.visit.reservation,
      service: visit.service
    }));
  }

  public async getReservationsAssignedToEmployee(
    id: Employee['id'],
    options?: EmployeeReservationQueryOptions
  ) {
    const reservations = await prisma.reservation.findMany({
      where: {
        visits: {
          some: {
            visitParts: { some: { employeeId: id, status: options?.status } }
          }
        }
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
        services: {
          include: {
            service: serviceWithUnit
          }
        }
      }
    });

    return (
      reservations?.map((reservation) => ({
        ...reservation,
        services: flattenNestedReservationServices(reservation.services)
      })) ?? null
    );
  }

  public async getEmployeeWithServices(employeeId: Employee['id']) {
    const employeeWithServices = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        ...employeeData,
        services: serviceWithUnit
      }
    });

    return {
      ...omit(employeeWithServices, 'services'),
      services: employeeWithServices?.services
    };
  }

  // admin only
  public async createEmployee(
    data: Omit<EmployeeCreationData, 'confirmPassword'>
  ) {
    return await prisma.employee.create({
      data: {
        ...data,
        isAdmin: false,
        services: {
          connect: data.services?.map((id) => ({ id })) ?? []
        }
      },
      ...selectEmployee
    });
  }

  public async changeEmployeeData(
    employeeId: Employee['id'],
    data: Partial<EmployeeChangeData>
  ) {
    return await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          ...employeeData,
          services: serviceWithUnit
        }
      });

      if (!employee) return null;

      const employeeServices = employee.services;

      const newServiceIds = data.services ?? [];

      const oldServicesIds = employeeServices.map((service) => service.id);

      const removedServiceIds = without(oldServicesIds, ...newServiceIds);
      const createdServiceIds = without(newServiceIds, ...oldServicesIds);

      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          isAdmin: data.isAdmin ?? false,
          services: {
            connect: createdServiceIds.map((id) => ({ id })),
            disconnect: removedServiceIds.map((id) => ({ id }))
          }
        },
        ...selectEmployee
      });

      return updatedEmployee;
    });
  }

  public async getEmployeesBusyHoursForVisit(
    options?: EmployeeWorkingHoursOptions
  ) {
    const periodParams = options?.period?.split('-');
    // not sure if there should be added 1 to the month
    // in order not to count it from 0
    const year = periodParams?.[0] ? parseInt(periodParams[0]) : undefined;
    const month = periodParams?.[1] ? parseInt(periodParams[1]) : undefined;

    const cyclicRanges = getCyclicDateRanges(year, month, options?.frequency);

    const employees = await prisma.employee.findMany({
      where: {
        visitParts: {
          some: { visitId: { in: options?.visitIds } }
        }
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
            }
          }
        }
      }
    });

    const { employeesWithWorkingHours, flattenedEmployeeVisitParts } =
      getEmployeesBusyHoursData(employees, cyclicRanges, options?.frequency);

    return {
      employees: employeesWithWorkingHours,
      busyHours: sumOfTimeslots(flattenedEmployeeVisitParts)
    };
  }
}
