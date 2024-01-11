import { faker } from '@faker-js/faker';
import { Employee, Frequency, Service, Status, Visit } from '@prisma/client';
import { omit } from 'lodash';
import {
  addressFixture,
  clientFixture,
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

export async function createMockDatabaseStructure({
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
      ...serviceFixture()
    }
  });

  const createdEmployee = await prisma.employee.create({
    data: {
      ...employeeFixture(),
      email: faker.internet.email()
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
    reservation: omit(reservation, 'visits'),
    visit: reservation.visits[0]!,
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
  const clientData = clientFixture();

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
    bookerEmail: clientData.email,
    address: addressFixture(),
    contactDetails: {
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      email: clientData.email,
      phone: clientData.phone
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
    },
    include: {
      visits: {
        include: {
          visitParts: true
        }
      }
    }
  });
}

export async function createEmployeeWithReservationAndVisitParts() {
  return await prisma.$transaction(async (tx) => {
    const createdEmployee = await tx.employee.create({
      data: {
        ...employeeFixture(),
        services: {
          create: {
            ...serviceFixture(),
            reservations: {
              create: {
                ...reservationServiceFixture(),
                reservation: {
                  create: {
                    ...reservationFixture(),
                    address: {
                      create: {
                        ...addressFixture()
                      }
                    },
                    visits: {
                      create: {
                        ...visitFixture()
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
    });

    const visitId =
      createdEmployee.services[0]!.reservations[0]!.reservation.visits[0]!.id;

    // create visit part for employee
    await tx.employee.update({
      where: { id: createdEmployee.id },
      data: {
        visitParts: {
          create: {
            ...visitPartFixture(),
            serviceId: createdEmployee.services[0]!.id,
            visitId
          }
        }
      }
    });

    const visitParts = await tx.visitPart.findMany({
      where: {
        visitId
      }
    });

    const employeeService = createdEmployee.services[0]!;
    const serviceReservation = employeeService.reservations[0]!;
    const reservation = serviceReservation.reservation;
    const visit = reservation.visits[0]!;

    return {
      employee: createdEmployee,
      reservation: omit(reservation, 'visits'),
      employeeService: omit(employeeService, 'service'),
      serviceReservation: omit(serviceReservation, 'reservation'),
      visit,
      visitParts: visitParts
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
      service: {
        connect: { id: serviceId }
      },
      employee: {
        connect: { id: employeeId }
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
