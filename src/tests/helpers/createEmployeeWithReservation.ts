import { faker } from '@faker-js/faker';
import {
  Employee,
  Frequency,
  Service,
  Status,
  Visit,
  VisitPart
} from '@prisma/client';
import { omit } from 'lodash';
import {
  addressFixture,
  employeeFixture,
  reservationFixture,
  reservationServiceFixture,
  serviceFixture,
  visitFixture,
  visitPartFixture
} from '~/tests/helpers/fixtures';

import prisma from '~/lib/prisma';

import { advanceDateByOneYear } from '~/utils/dateUtils';
import { createVisits } from '~/utils/reservationUtils';

export async function createMockReservationEmployeeServiceData({
  firstVisitStartDate,
  firstVisitEndDate,
  frequency
}: {
  firstVisitStartDate: string;
  firstVisitEndDate: string;
  frequency: Frequency;
}) {
  const createdService = await prisma.service.create({
    data: {
      ...serviceFixture
    }
  });

  const createdEmployee = await prisma.employee.create({
    data: {
      ...employeeFixture,
      email: faker.internet.email()
    }
  });

  await prisma.employeeService.create({
    data: {
      employeeId: createdEmployee.id,
      serviceId: createdService.id
    }
  });

  const reservation = await createMockReservation({
    firstVisitStartDate,
    firstVisitEndDate,
    frequency,
    employeeId: createdEmployee.id,
    serviceId: createdService.id
  });

  return {
    reservation,
    employee: omit(createdEmployee, 'password'),
    service: createdService
  };
}

export async function createMockReservation({
  firstVisitStartDate,
  firstVisitEndDate,
  frequency,
  employeeId,
  serviceId
}: {
  firstVisitStartDate: string;
  firstVisitEndDate: string;
  frequency: Frequency;
  employeeId: Employee['id'];
  serviceId: Service['id'];
}) {
  const clientEmail = faker.internet.email();
  const exampleData = {
    frequency,
    detergentsCost: 15,
    visitParts: [
      {
        serviceId,
        numberOfUnits: 44,
        employeeId,
        startDate: firstVisitStartDate,
        endDate: firstVisitEndDate,
        cost: 220
      }
    ],
    bookerEmail: clientEmail,
    address: {
      street: 'Testowa',
      houseNumber: '123',
      postCode: '31-526'
    },
    contactDetails: {
      firstName: 'Jan',
      lastName: 'Testowy',
      email: clientEmail,
      phone: '+48123456789'
    },
    services: [
      {
        serviceId: serviceId,
        isMainServiceForReservation: true
      }
    ],
    extraInfo: null
  };

  const {
    bookerEmail,
    address,
    contactDetails,
    visitParts: firstVisitParts,
    services,
    extraInfo
  } = exampleData;

  const { firstName: bookerFirstName, lastName: bookerLastName } =
    contactDetails;

  const visitPartTimeslots = firstVisitParts.map(
    ({ startDate, endDate, ...other }) => ({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...other
    })
  );

  const lastEndDate = visitPartTimeslots.at(-1)!.endDate;
  const endDate = new Date(advanceDateByOneYear(lastEndDate));
  const newVisits = createVisits(exampleData, frequency, endDate.toISOString());

  return await prisma.reservation.create({
    data: {
      ...reservationFixture(),
      frequency,
      bookerFirstName,
      bookerLastName,
      extraInfo,
      visits: {
        create: newVisits.map((visit) => ({
          ...visit,
          visitParts: {
            create: visit.visitParts.map((visitPart) => ({
              ...visitPart,
              status: Status.TO_BE_CONFIRMED
            }))
          }
        }))
      },
      address: {
        create: address
      },
      client: {
        connectOrCreate: {
          where: {
            email: bookerEmail
          },
          create: {
            email: bookerEmail
          }
        }
      },
      services: {
        createMany: {
          data: services
        }
      }
    }
  });
}

export async function createEmployeeWithReservationAndVisitParts() {
  return await prisma.$transaction(async (tx) => {
    const createdEmployee = await tx.employee.create({
      data: {
        ...employeeFixture,
        services: {
          create: {
            service: {
              create: {
                ...serviceFixture,
                reservations: {
                  create: {
                    ...reservationServiceFixture,
                    reservation: {
                      create: {
                        ...reservationFixture(),
                        address: {
                          create: {
                            ...addressFixture
                          }
                        },
                        visits: {
                          create: {
                            ...visitFixture
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
                reservations: {
                  include: {
                    reservation: {
                      include: {
                        visits: true
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

    const visitId =
      createdEmployee.services[0]!.service.reservations[0]!.reservation
        .visits[0]!.id;

    // create visit part for employee
    await tx.employee.update({
      where: { id: createdEmployee.id },
      data: {
        services: {
          update: {
            where: {
              employeeId_serviceId: {
                employeeId: createdEmployee.id,
                serviceId: createdEmployee.services[0]!.serviceId
              }
            },
            data: {
              visitParts: {
                create: {
                  ...visitPartFixture,
                  visitId
                }
              }
            }
          }
        }
      }
    });

    return {
      employee: createdEmployee,
      reservation: omit(
        createdEmployee.services[0]!.service.reservations[0]!.reservation,
        'visits'
      )
    };
  });
}

export const createExampleVisitPartForEmployee = async (
  employeeId: Employee['id'],
  serviceId: Service['id'],
  visitId: Visit['id']
) => {
  const visitPart = await prisma.visitPart.create({
    data: {
      cost: 0,
      numberOfUnits: 1,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      status: 'ACTIVE',
      employeeService: {
        create: {
          serviceId,
          employeeId
        }
      },
      visit: {
        connect: {
          id: visitId
        }
      }
    }
  });

  return visitPart;
};
