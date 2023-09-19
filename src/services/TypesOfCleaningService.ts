import { type Employee, type Service } from '@prisma/client';

import { prisma } from '~/db';

export default class TypesOfCleaningService {
  public async getServiceById(id: Service['id']) {
    let service: Service | null = null;

    try {
      service = await prisma.service.findUnique({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return service;
  }

  public async getAllServices() {
    let services: Service[] | null = null;
    try {
      services = await prisma.service.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return services;
  }

  public async getEmployeesOfferingService(id: Service['id']) {
    let employees: Employee[] | null = null;

    try {
      employees = await prisma.service
        .findUnique({
          where: { id },
          include: {
            employees: true
          }
        })
        .then((service) => service?.employees ?? []);
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return employees;
  }

  // admin only
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

  // admin only
  public async changeServicePrice(data: Pick<Service, 'id' | 'price'>) {
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
}
