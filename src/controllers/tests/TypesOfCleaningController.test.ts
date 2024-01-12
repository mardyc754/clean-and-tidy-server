import { faker } from '@faker-js/faker';
import { Frequency } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, vi } from 'vitest';
import { expect, it } from 'vitest';
import App from '~/App';
import { createMockDatabaseStructure } from '~/tests/helpers/createEmployeeWithReservation';
import { serviceFixture, unitFixture } from '~/tests/helpers/fixtures';
import prisma from '~/tests/prisma';
import resetDb from '~/tests/resetDb';

import { UserRole } from '~/constants';

import TypesOfCleaningController from '../TypesOfCleaningController';

describe('/services', () => {
  const app = new App([new TypesOfCleaningController()]).instance;

  afterEach(async () => {
    await resetDb();
    vi.resetAllMocks();
  });
  describe('GET /', () => {
    it('should return 200 with all services', async () => {
      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false
        }
      });

      const primaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: true
        }
      });

      const { status, body } = await request(app).get('/services');

      expect(status).toBe(200);
      expect(body).toHaveLength(2);

      expect(body).toStrictEqual([
        {
          ...secondaryService,
          detergentsCost: secondaryService.detergentsCost!.toString(),
          id: expect.any(Number),
          unitId: null,
          unit: null
        },
        {
          ...primaryService,
          detergentsCost: primaryService.detergentsCost!.toString(),
          id: expect.any(Number),
          unitId: null,
          unit: null
        }
      ]);
    });

    it('should return 200  with only primary services', async () => {
      await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false
        }
      });

      const primaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: true
        }
      });

      const { status, body } = await request(app).get('/services').query({
        primaryOnly: true
      });

      expect(status).toBe(200);
      expect(body).toHaveLength(1);

      expect(body[0]).toStrictEqual({
        ...primaryService,
        detergentsCost: primaryService.detergentsCost!.toString(),
        id: expect.any(Number),
        unitId: null,
        unit: null
      });
    });
  });

  describe('POST /', () => {
    it('should return 201 with created service', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false
        }
      });

      const unit = unitFixture();
      const secondaryServices = [secondaryService.id];
      const serviceName = faker.lorem.word();
      const frequencies = [Frequency.ONCE, Frequency.ONCE_A_MONTH];

      const { status, body } = await request(app)
        .post('/services')
        .send({
          // ...serviceFixture(),
          name: serviceName,
          unit,
          secondaryServices,
          frequencies
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        // ...serviceFixture(),
        name: serviceName,
        id: expect.any(Number),
        unitId: expect.any(Number),
        isPrimary: false,
        minCostIfPrimary: null,
        minNumberOfUnitsIfPrimary: null,
        detergentsCost: '0'
      });
    });

    it('should return 200 and set service as primary if requested so', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false,
          minCostIfPrimary: 100
        }
      });

      const unit = unitFixture();
      const secondaryServices = [secondaryService.id];
      const serviceName = faker.lorem.word();
      const frequencies = [Frequency.ONCE, Frequency.ONCE_A_MONTH];

      const { status, body } = await request(app)
        .post('/services')
        .send({
          name: serviceName,
          unit,
          secondaryServices,
          frequencies,
          isPrimary: true
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        name: serviceName,
        id: expect.any(Number),
        unitId: expect.any(Number),
        isPrimary: true,
        minCostIfPrimary: null,
        minNumberOfUnitsIfPrimary: null,
        detergentsCost: '0'
      });
    });

    it('should return 200 with minimum requirements', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const serviceName = faker.lorem.word();

      const { status, body } = await request(app)
        .post('/services')
        .send({
          name: serviceName
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        name: serviceName,
        id: expect.any(Number),
        unitId: null,
        isPrimary: false,
        minCostIfPrimary: null,
        minNumberOfUnitsIfPrimary: null,
        detergentsCost: '0'
      });
    });

    it('should return 403 if is not admin', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const serviceName = faker.lorem.word();

      const { status, body } = await request(app)
        .post('/services')
        .send({
          name: serviceName
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(403);
      expect(body).toStrictEqual({
        message: 'Cannot access resource with given permissions'
      });
    });
  });

  describe('GET /busy-hours', () => {
    it('should handle busy hours properly for one-time reservation', async () => {
      const { employee, reservation, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-12T11:00:00.000Z',
        firstVisitEndDate: '2024-02-12T14:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/services/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          serviceIds: [service.id, secondService.id].join(','),
          frequency: Frequency.ONCE,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [],
          employees: [
            expect.objectContaining({
              ...employee,
              services: [service.id],
              workingHours: [
                {
                  endDate: '2024-01-12T11:30:00.000Z',
                  startDate: '2024-01-12T09:30:00.000Z'
                }
              ]
            }),
            expect.objectContaining({
              ...secondEmployee,
              services: [secondService.id],
              workingHours: []
            })
          ]
        })
      );
    });

    it('should handle busy hours properly for single reservation if frequency not provided', async () => {
      const { employee, reservation, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-01-12T11:00:00.000Z',
        firstVisitEndDate: '2024-01-12T14:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/services/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          serviceIds: [service.id, secondService.id].join(','),
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [
            {
              startDate: '2024-01-12T10:30:00.000Z',
              endDate: '2024-01-12T11:30:00.000Z'
            }
          ],
          employees: [
            expect.objectContaining({
              ...employee,
              services: [service.id],
              workingHours: [
                {
                  endDate: '2024-01-12T11:30:00.000Z',
                  startDate: '2024-01-12T09:30:00.000Z'
                }
              ]
            }),
            expect.objectContaining({
              ...secondEmployee,
              services: [secondService.id],
              workingHours: [
                {
                  startDate: '2024-01-12T10:30:00.000Z',
                  endDate: '2024-01-12T14:30:00.000Z'
                }
              ]
            })
          ]
        })
      );
    });

    it('should handle busy hours properly for cyclic reservation - no overlap', async () => {
      const { employee, reservation, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-14T11:00:00.000Z',
        firstVisitEndDate: '2024-02-14T14:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/services/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          serviceIds: [service.id, secondService.id].join(','),
          frequency: Frequency.ONCE_A_MONTH,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [],
          employees: [
            expect.objectContaining({
              ...employee,
              services: [service.id],
              workingHours: [
                {
                  endDate: '2024-01-11T11:30:00.000Z',
                  startDate: '2024-01-11T09:30:00.000Z'
                },
                {
                  endDate: '2024-01-12T11:30:00.000Z',
                  startDate: '2024-01-12T09:30:00.000Z'
                }
              ]
            }),
            expect.objectContaining({
              ...secondEmployee,
              services: [secondService.id],
              workingHours: [
                {
                  endDate: '2024-01-14T14:30:00.000Z',
                  startDate: '2024-01-14T10:30:00.000Z'
                }
              ]
            })
          ]
        })
      );
    });

    it('should handle busy hours properly for cyclic reservation - overlap', async () => {
      const { employee, reservation, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-12T11:00:00.000Z',
        firstVisitEndDate: '2024-02-12T14:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/services/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          serviceIds: [service.id, secondService.id].join(','),
          frequency: Frequency.ONCE_A_MONTH,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [
            {
              startDate: '2024-01-11T10:30:00.000Z',
              endDate: '2024-01-11T11:30:00.000Z'
            },
            {
              startDate: '2024-01-12T10:30:00.000Z',
              endDate: '2024-01-12T11:30:00.000Z'
            }
          ],
          employees: [
            expect.objectContaining({
              ...employee,
              services: [service.id],
              workingHours: [
                {
                  startDate: '2024-01-11T09:30:00.000Z',
                  endDate: '2024-01-11T11:30:00.000Z'
                },
                {
                  endDate: '2024-01-12T11:30:00.000Z',
                  startDate: '2024-01-12T09:30:00.000Z'
                }
              ]
            }),
            expect.objectContaining({
              ...secondEmployee,
              services: [secondService.id],
              workingHours: [
                {
                  startDate: '2024-01-11T10:30:00.000Z',
                  endDate: '2024-01-11T14:30:00.000Z'
                },
                {
                  startDate: '2024-01-12T10:30:00.000Z',
                  endDate: '2024-01-12T14:30:00.000Z'
                }
              ]
            })
          ]
        })
      );
    });

    it('should handle busy hours properly for cyclic reservation - overlap contained', async () => {
      const { employee, reservation, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T09:00:00.000Z',
          firstVisitEndDate: '2024-01-12T15:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-12T11:00:00.000Z',
        firstVisitEndDate: '2024-02-12T14:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/services/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          serviceIds: [service.id, secondService.id].join(','),
          frequency: Frequency.ONCE_A_MONTH,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [
            {
              startDate: '2024-01-11T10:30:00.000Z',
              endDate: '2024-01-11T14:30:00.000Z'
            },
            {
              startDate: '2024-01-12T10:30:00.000Z',
              endDate: '2024-01-12T14:30:00.000Z'
            }
          ],
          employees: [
            expect.objectContaining({
              ...employee,
              services: [service.id],
              workingHours: [
                {
                  startDate: '2024-01-11T08:30:00.000Z',
                  endDate: '2024-01-11T15:30:00.000Z'
                },
                {
                  startDate: '2024-01-12T08:30:00.000Z',
                  endDate: '2024-01-12T15:30:00.000Z'
                }
              ]
            }),
            expect.objectContaining({
              ...secondEmployee,
              services: [secondService.id],
              workingHours: [
                {
                  startDate: '2024-01-11T10:30:00.000Z',
                  endDate: '2024-01-11T14:30:00.000Z'
                },
                {
                  startDate: '2024-01-12T10:30:00.000Z',
                  endDate: '2024-01-12T14:30:00.000Z'
                }
              ]
            })
          ]
        })
      );
    });

    it('should handle busy hours properly for cyclic reservation - only for selected services', async () => {
      const { employee, reservation, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-12T11:00:00.000Z',
        firstVisitEndDate: '2024-02-12T14:00:00.000Z'
      });

      await createMockDatabaseStructure({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-12T07:00:00.000Z',
        firstVisitEndDate: '2024-02-12T16:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/services/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          serviceIds: [service.id, secondService.id].join(','),
          frequency: Frequency.ONCE_A_MONTH,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [
            {
              startDate: '2024-01-11T10:30:00.000Z',
              endDate: '2024-01-11T11:30:00.000Z'
            },
            {
              startDate: '2024-01-12T10:30:00.000Z',
              endDate: '2024-01-12T11:30:00.000Z'
            }
          ],
          employees: [
            expect.objectContaining({
              ...employee,
              services: [service.id],
              workingHours: [
                {
                  startDate: '2024-01-11T09:30:00.000Z',
                  endDate: '2024-01-11T11:30:00.000Z'
                },
                {
                  endDate: '2024-01-12T11:30:00.000Z',
                  startDate: '2024-01-12T09:30:00.000Z'
                }
              ]
            }),
            expect.objectContaining({
              ...secondEmployee,
              services: [secondService.id],
              workingHours: [
                {
                  startDate: '2024-01-11T10:30:00.000Z',
                  endDate: '2024-01-11T14:30:00.000Z'
                },
                {
                  startDate: '2024-01-12T10:30:00.000Z',
                  endDate: '2024-01-12T14:30:00.000Z'
                }
              ]
            })
          ]
        })
      );
    });
  });

  describe('GET /:id', () => {
    it('should return 200 with service data if found', async () => {
      const primaryServiceUnit = unitFixture();

      const primaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: true,
          unit: {
            create: primaryServiceUnit
          }
        }
      });

      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false
        }
      });

      const service = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false,
          secondaryServices: {
            connect: {
              id: secondaryService.id
            }
          },
          primaryServices: {
            connect: {
              id: primaryService.id
            }
          }
        }
      });

      const { status, body } = await request(app).get(
        `/services/${service.id}`
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...service,
        detergentsCost: service.detergentsCost!.toString(),
        id: expect.any(Number),
        unitId: null,
        unit: null,
        cleaningFrequencies: [],
        secondaryServices: [
          {
            id: expect.any(Number),
            name: secondaryService.name,
            unit: null
          }
        ],
        primaryServices: [
          {
            name: primaryService.name,
            id: expect.any(Number),
            unit: {
              ...primaryServiceUnit,
              price: primaryServiceUnit.price.toString()
            }
          }
        ]
      });
    });

    it('should return 404 if service not found', async () => {
      const { status, body } = await request(app).get(`/services/1`);

      expect(status).toBe(404);
      expect(body).toStrictEqual({ message: `Service with id=1 not found` });
    });
  });

  describe('PUT /:id', () => {
    it('should return 200 with updated service', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false,
          unit: {
            create: { ...unitFixture(), price: 10 }
          }
        },
        include: {
          unit: true
        }
      });

      const { status, body } = await request(app)
        .put(`/services/${secondaryService.id}`)
        .send({
          unit: {
            price: 12
          }
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...secondaryService,
        detergentsCost: secondaryService.detergentsCost!.toString(),
        unit: {
          ...secondaryService.unit,
          price: '12'
        }
      });
    });

    it('should return 400 if editing wrong data', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false,
          unit: {
            create: { ...unitFixture(), price: 10 }
          }
        },
        include: {
          unit: true
        }
      });

      const { status, body } = await request(app)
        .put(`/services/${secondaryService.id}`)
        .send({
          unit: {
            price: 12
          },
          name: 'new name'
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(400);
      expect(body).toStrictEqual(
        expect.objectContaining({
          message: 'Error when parsing data type'
        })
      );
    });

    it('should return 403 if is not admin', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const secondaryService = await prisma.service.create({
        data: {
          ...serviceFixture(),
          isPrimary: false,
          unit: {
            create: { ...unitFixture(), price: 10 }
          }
        },
        include: {
          unit: true
        }
      });

      const { status, body } = await request(app)
        .put(`/services/${secondaryService.id}`)
        .send({
          unit: {
            price: 12
          }
        })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(403);
      expect(body).toStrictEqual({
        message: 'Cannot access resource with given permissions'
      });
    });
  });
});
