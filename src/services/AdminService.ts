import type { Employee } from '@prisma/client';

import prisma from '~/lib/prisma';

export default class AdminService {
  public async createEmployee(
    data: Omit<Employee, 'id' | 'services' | 'isAdmin'>
  ) {
    let employee: Employee | null = null;

    try {
      employee = await prisma.employee.create({
        data: {
          ...data,
          isAdmin: false
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employee;
  }
}
