import {
  type Reservation,
  type Employee,
  type Service,
  ReservationStatus
} from '@prisma/client';

import { prisma } from '~/db';

export default class EmployeeService {
  public async getEmployeeById(id: Employee['id']) {
    let employee: Employee | null = null;

    try {
      employee = await prisma.employee.findFirst({
        where: { id }
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

  public async getEmployeeReservations(
    employeeId: Employee['id'],
    status?: Reservation['status']
  ) {
    let reservations: Reservation[] | null = null;

    const reservationStatusFilter = status ? { where: { status } } : true;

    try {
      const employeeWithReservations = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          recurringReservations: {
            include: {
              reservations: reservationStatusFilter
            }
          }
        }
      });

      reservations =
        employeeWithReservations?.recurringReservations.flatMap(
          (group) => group.reservations
        ) ?? [];
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return reservations;
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

  // delete employee account when the employee does not have any reservations
  public async deleteEmployee(employeeId: Employee['id']) {
    let deleteEmployee: Employee | null = null;

    const employeeActiveReservations = await this.getEmployeeReservations(
      employeeId,
      ReservationStatus.ACTIVE
    );

    if (
      !employeeActiveReservations ||
      employeeActiveReservations.length === 0
    ) {
      try {
        deleteEmployee = await prisma.employee.delete({
          where: { id: employeeId }
        });
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
      }
    }

    return deleteEmployee;
  }
}
