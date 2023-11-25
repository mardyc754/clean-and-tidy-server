import {
  type Employee,
  type Service,
  Status,
  VisitEmployee
} from '@prisma/client';
import { omit } from 'lodash';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import {
  type EmployeeCreationData,
  type EmployeeWorkingHoursQueryOptions
} from '~/schemas/employee';

import { calculateBusyHours } from '~/utils/employeeUtils';
import { executeDatabaseOperation } from '~/utils/queryUtils';

type EmployeeReservationQueryOptions = {
  status: Status;
};

type EmployeeFilterOptions = {
  includeVisits?: boolean;
};

function includeServicesWithUnit() {
  return {
    services: {
      include: {
        service: {
          include: {
            unit: true
          }
        }
      }
    }
  };
}
function getDetailedVisitsData(employeeId?: Employee['id']) {
  return {
    visits: {
      where: employeeId ? { employeeId } : undefined,
      include: {
        visit: {
          include: {
            reservation: {
              include: {
                ...includeServicesWithUnit()
              }
            }
          }
        }
      }
    }
  };
}

export default class EmployeeService {
  public async getEmployeeById(id: Employee['id']) {
    let employee: Employee | null = null;

    try {
      employee = await prisma.employee.findUnique({
        where: { id }
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
    return await executeDatabaseOperation(
      prisma.employee.findMany({
        select: {
          ...prismaExclude('Employee', ['password']),
          ...(options?.includeVisits ? getDetailedVisitsData() : undefined)
        }
      })
    );
  }

  public async getEmployeeVisits(
    employeeId: Employee['id'],
    status?: VisitEmployee['status']
  ) {
    let visits: VisitEmployee[] | null = null;

    const reservationStatusFilter = status ? { where: { status } } : true;

    try {
      const employeeWithVisits = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          ...getDetailedVisitsData(employeeId)
        }
      });

      visits = employeeWithVisits?.visits ?? [];
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return visits;
  }

  public async getReservationsAssignedToEmployee(
    id: Employee['id'],
    options?: EmployeeReservationQueryOptions
  ) {
    return await executeDatabaseOperation(
      prisma.reservation.findMany({
        where: {
          visits: { some: { employees: { some: { employee: { id } } } } },
          status: options?.status
        },
        include: {
          services: {
            include: {
              service: {
                include: {
                  unit: true
                }
              }
            }
          },
          visits: {
            where: { employees: { some: { employee: { id } } } }
          }
        }
      })
    );
  }

  public async getEmployeeServices(employeeId: Employee['id']) {
    let services: Service[] | null = null;

    try {
      const employeeWithServices = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          services: {
            include: {
              unit: true
            }
          }
        }
      });

      services = employeeWithServices?.services ?? [];
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
            connect: data.services?.map((id) => ({
              id
            }))
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

  public async linkEmployeeWithService(
    employeeId: Employee['id'],
    serviceId: Service['id']
  ) {
    let newEmployeeService: Service | null = null;

    try {
      const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          services: {
            connect: { id: serviceId }
          }
        },
        select: {
          services: { where: { id: serviceId } }
        }
      });

      newEmployeeService = updatedEmployee.services[0] ?? null;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return newEmployeeService;
  }

  public async changeEmployeeServiceAssignment(
    employeeId: Employee['id'],
    serviceIds: Array<Service['id']>
  ) {
    let newEmployeeServices: Service[] | null = null;

    const employeeServices = await this.getEmployeeServices(employeeId);

    if (employeeServices === null) {
      return null;
    }

    const employeeServicesIds = employeeServices.map((service) => service.id);

    try {
      const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          services: {
            disconnect: employeeServicesIds.map((id) => ({ id })),
            connect: serviceIds.map((id) => ({ id }))
          }
        },
        select: {
          services: {
            include: {
              unit: true
            }
          }
        }
      });

      newEmployeeServices = updatedEmployee.services;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return newEmployeeServices;
  }

  public async getEmployeesOfferingService(id: Service['id']) {
    let employees: Employee[] | null = null;

    try {
      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          employees: true
        }
      });

      employees = service?.employees ?? [];
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employees;
  }

  public async getServiceBusyHours(
    id: Service['id'],
    options?: EmployeeWorkingHoursQueryOptions
  ) {
    const employeesWithVisits = await executeDatabaseOperation(
      prisma.employee.findMany({
        where: {
          services: {
            some: {
              // id: { in: [1, 2] }
              id
            }
          }
        },
        select: {
          ...prismaExclude('Employee', ['password']),
          visits: {
            where: {
              visit: {
                startDate: {
                  gte: options?.from ? new Date(options?.from) : undefined
                },
                endDate: {
                  lte: options?.to ? new Date(options?.to) : undefined
                }
              }
            },
            orderBy: {
              visit: {
                startDate: 'asc'
              }
            },
            select: {
              visit: {
                select: {
                  startDate: true,
                  endDate: true
                }
              }
            }
          }
        }
      })
    );

    if (!employeesWithVisits) {
      return null;
    }

    const visitTimespans = employeesWithVisits.map((employee) => ({
      // employee.visits.flatMap((visit) => ({
      //   startDate: visit.visit.startDate,
      //   endDate: visit.visit.endDate
      // }))
      ...omit(employee, ['visits']),
      workingHours: employee.visits.flatMap(({ visit }) => ({
        start: visit.startDate,
        end: visit.endDate
      }))
    }));

    return visitTimespans;
  }

  public async getBusyHours(
    id: Service['id'],
    options?: EmployeeWorkingHoursQueryOptions
  ) {
    const employeesWithWorkingHours = await this.getServiceBusyHours(
      id,
      options
    );

    return calculateBusyHours(
      employeesWithWorkingHours?.map(({ workingHours }) => workingHours) ?? []
    );
  }
}
