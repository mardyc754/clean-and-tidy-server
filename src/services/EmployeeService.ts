import {
  type Visit,
  type Employee,
  type Service,
  Status,
  VisitEmployee
} from '@prisma/client';

import { prisma } from '~/db';
import type { EmployeeCreationData } from '~/schemas/employee';
import { executeDatabaseOperation } from '~/utils/queryUtils';

type EmployeeReservationQueryOptions = {
  status: Status;
};

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

  public async getAllEmployees() {
    let employees: Employee[] | null = null;

    try {
      employees = await prisma.employee.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employees;
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
          visits: {
            where: { employeeId },
            include: {
              visit: {
                include: {
                  reservation: {
                    include: {
                      services: {
                        include: {
                          service: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
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
              service: true
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
          services: true
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
}
