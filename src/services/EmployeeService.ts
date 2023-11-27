import { type Employee, type Service, Status, VisitPart } from '@prisma/client';
import { omit, without } from 'lodash';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import {
  type EmployeeCreationData,
  type EmployeeWorkingHoursQueryOptions
} from '~/schemas/employee';

import {
  includeFullService,
  includeServiceVisitPartsAndReservation,
  includeVisitParts,
  selectEmployee,
  serviceWithUnit
} from '~/queries/serviceQuery';

import { calculateBusyHours } from '~/utils/employeeUtils';
import { executeDatabaseOperation } from '~/utils/queryUtils';
import { flattenVisitPartsFromServices } from '~/utils/services';
import { flattenNestedReservationServices } from '~/utils/visits';

type EmployeeReservationQueryOptions = {
  status: Status;
};

type EmployeeFilterOptions = {
  includeVisits?: boolean;
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

  public async getAllEmployees(options?: EmployeeFilterOptions) {
    const employees = await executeDatabaseOperation(
      prisma.employee.findMany({
        select: {
          ...prismaExclude('Employee', ['password']),
          services: includeServiceVisitPartsAndReservation
        }
      })
    );

    return employees
      ? employees.map((employee) => ({
          ...omit(employee, 'services'),
          visitParts: flattenVisitPartsFromServices(employee.services)
        }))
      : null;
  }

  public async getEmployeeVisits(
    employeeId: Employee['id'],
    status?: VisitPart['status']
  ) {
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

  public async getEmployeeServices(employeeId: Employee['id']) {
    let services: Service[] | null = null;

    try {
      const employeeWithServices = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          services: includeFullService
        }
      });

      services =
        employeeWithServices?.services.flatMap(({ service }) => service) ?? [];
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return services;
  }

  // admin only
  public async createEmployee(data: EmployeeCreationData) {
    let employee: Employee | null = null;

    try {
      employee = await prisma.employee.create({
        data: {
          ...data,
          isAdmin: false,
          services: {
            create: data.services?.map((id) => ({ serviceId: id })) ?? []
          }
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employee;
  }

  // before finishing this function implementation,
  // we need to create function for checking available hours
  public async changeWorkingHours(
    employeeData: Pick<Employee, 'id' | 'startHour' | 'endHour'>
  ) {
    const { id, ...rest } = employeeData;
    let newEmployeeData: Employee | null = null;

    try {
      newEmployeeData = await prisma.employee.update({
        where: { id },
        data: {
          ...rest
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return newEmployeeData;
  }

  // delete employee account when the employee does not have any visits
  public async deleteEmployee(employeeId: Employee['id']) {
    let deleteEmployee: Employee | null = null;

    const employeeActiveVisits = await this.getEmployeeVisits(
      employeeId,
      Status.ACTIVE
    );

    // if (!employeeActiveVisits || employeeActiveVisits.length === 0) {
    //   try {
    //     deleteEmployee = await prisma.employee.delete({
    //       where: { id: employeeId }
    //     });
    //   } catch (err) {
    //     console.error(`Something went wrong: ${err}`);
    //   }
    // }

    return deleteEmployee;
  }

  public async changeEmployeeServiceAssignment(
    employeeId: Employee['id'],
    serviceIds: Array<Service['id']>
  ) {
    const employeeServices = await this.getEmployeeServices(employeeId);

    if (employeeServices === null) {
      return null;
    }

    const employeeServicesIds = employeeServices.map((service) => service.id);
    const removedServiceIds = without(employeeServicesIds, ...serviceIds);
    const createdServiceIds = without(serviceIds, ...employeeServicesIds);

    try {
      const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          services: {
            deleteMany: removedServiceIds.map((id) => ({ serviceId: id })),
            createMany: {
              data: createdServiceIds.map((id) => ({ serviceId: id }))
            }
          }
        },
        select: {
          services: {
            include: {
              service: serviceWithUnit
            }
          }
        }
      });

      return updatedEmployee.services.map(({ service }) => service);
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return null;
  }

  public async getEmployeesOfferingService(id: Service['id']) {
    try {
      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          employees: {
            include: {
              employee: selectEmployee
            }
          }
        }
      });

      return service?.employees.flatMap(({ employee }) => employee) ?? null;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return null;
  }
}
