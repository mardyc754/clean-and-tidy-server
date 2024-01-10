import { faker } from '@faker-js/faker';
import { Frequency, Status } from '@prisma/client';

import prisma from '~/lib/prisma';

export const createEmployeeWithReservationAndVisitParts = async () => {
  const employee = await prisma.employee.create({
    data: {
      email: faker.internet.email(),
      password: faker.internet.password(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: '123456789',
      isAdmin: false,
      services: {
        create: {
          service: {
            create: {
              name: faker.lorem.word(),
              reservations: {
                create: {
                  reservation: {
                    create: {
                      name: faker.lorem.word(),
                      frequency: Frequency.ONCE,
                      bookerFirstName: faker.person.firstName(),
                      bookerLastName: faker.person.lastName(),
                      address: {
                        create: {
                          street: faker.location.street(),
                          postCode: '12-345',
                          houseNumber: faker.location.buildingNumber()
                        }
                      },
                      client: {
                        create: {
                          email: faker.internet.email(),
                          firstName: faker.person.firstName(),
                          lastName: faker.person.lastName(),
                          phone: '123456789'
                        }
                      },
                      visits: {
                        create: {
                          detergentsCost: 0
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    include: {
      services: {
        include: {
          service: {
            include: {
              reservations: true
            }
          }
        }
      }
    }
  });

  // const visitPart = await prisma.visitPart.create({
  //   data: {
  //     employeeId: employee.id,
  //     startDate: new Date().toISOString(),
  //     endDate: new Date().toISOString(),
  //     status: Status.ACTIVE,
  //     employeeService: {
  //       create: {
  //         serviceId: employee.services[0].serviceId
  //       }
  //     },
  //   }
  // });

  return employee;
};
