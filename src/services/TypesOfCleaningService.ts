import { type Employee, type Service } from '@prisma/client';

import { prisma } from '~/db';
import { ChangeServicePriceData } from '~/schemas/typesOfCleaning';
import { executeDatabaseOperation } from './utils';

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
    const services = await executeDatabaseOperation(
      async () => await prisma.service.findMany()
    );
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
  public async changeServicePrice(data: ChangeServicePriceData) {
    const { id, price } = data;
    const service = await executeDatabaseOperation(async () => {
      await prisma.service.update({
        where: { id },
        data: {
          unit: {
            update: { price }
          }
        }
      });
    });
    return service;
  }

  // admin only
  public async deleteService(id: Service['id']) {
    console.log({ id });
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
