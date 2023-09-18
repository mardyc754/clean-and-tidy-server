import type { Employee, Service } from '@prisma/client';

import { prisma } from '~/db';

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

  public async createService(data: Omit<Service, 'id'>) {
    let service: Service | null = null;

    try {
      service = await prisma.service.create({
        data
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return service;
  }

  public async changeServicePrice(data: Omit<Service, 'name'>) {
    const { id, price } = data;
    let service: Service | null = null;

    try {
      service = await prisma.service.update({
        where: { id },
        data: { price }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return service;
  }

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
}
