import { Frequency, Status } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, vi } from 'vitest';
import { expect, it } from 'vitest';
import App from '~/App';
import { createMockDatabaseStructure } from '~/tests/helpers/createEmployeeWithReservation';
import {
  addressFixture,
  clientFixture,
  employeeFixture,
  serviceFixture
} from '~/tests/helpers/fixtures';
import prisma from '~/tests/prisma';
import resetDb from '~/tests/resetDb';

import { UserRole } from '~/constants';

import { ReservationCreationData } from '~/schemas/reservation';

import {
  advanceDateByMonths,
  advanceDateByWeeks,
  isAtLeastOneDayBetween,
  isBefore
} from '~/utils/dateUtils';

import ReservationController from '../ReservationController';

describe('/reservations', () => {
  const app = new App([new ReservationController()]).instance;

  afterEach(async () => {
    await resetDb();
    vi.useRealTimers();
  });

  async function getExampleData(
    data?: Partial<ReservationCreationData>,
    employeeId?: number,
    serviceId?: number
  ) {
    const service =
      serviceId ??
      (await prisma.service
        .create({
          data: {
            ...serviceFixture()
          }
        })
        .then((service) => service.id));

    const clientData = clientFixture();
    const employee =
      employeeId ??
      (await prisma.employee
        .create({
          data: {
            ...employeeFixture()
          }
        })
        .then((employee) => employee.id));

    return {
      frequency: Frequency.ONCE,
      detergentsCost: 15,
      visitParts: [
        {
          serviceId: service,
          numberOfUnits: 44,
          employeeId: employee,
          startDate: '2024-01-02T10:00:00.000Z',
          endDate: '2024-01-02T14:00:00.000Z',
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
          serviceId: service,
          isMainServiceForReservation: true
        }
      ],
      extraInfo: null,
      ...data
    };
  }

  describe('GET /', () => {
    it('should return 200 with reservations data', async () => {
      const { reservation, visit, employee, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE,
          firstVisitStartDate: '2024-01-02T10:00:00.000Z',
          firstVisitEndDate: '2024-01-02T14:00:00.000Z'
        });

      const {
        reservation: secondReservation,
        visit: secondVisit,
        employee: secondEmployee,
        service: secondService
      } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-01-12T10:00:00.000Z',
        firstVisitEndDate: '2024-01-12T14:00:00.000Z'
      });

      const { status, body } = await request(app).get(`/reservations`);

      expect(status).toBe(200);

      expect(body).toHaveLength(2);
      expect(body).toStrictEqual([
        {
          ...reservation,
          frequency: Frequency.ONCE,
          visits: [
            {
              ...visit,
              detergentsCost: visit.detergentsCost.toString(),
              visitParts: visit.visitParts.map((visitPart) => ({
                ...visitPart,
                startDate: visitPart.startDate.toISOString(),
                endDate: visitPart.endDate.toISOString(),
                cost: visitPart.cost.toString(),
                employee
              }))
            }
          ],
          services: [
            {
              ...service,
              isMainServiceForReservation: true,
              detergentsCost: service.detergentsCost!.toString(),
              reservationId: reservation.id,
              unit: null
            }
          ]
        },

        {
          ...secondReservation,
          frequency: Frequency.ONCE,
          visits: [
            {
              ...secondVisit,
              detergentsCost: secondVisit.detergentsCost.toString(),
              visitParts: secondVisit.visitParts.map((visitPart) => ({
                ...visitPart,
                startDate: visitPart.startDate.toISOString(),
                endDate: visitPart.endDate.toISOString(),
                cost: visitPart.cost.toString(),
                employee: secondEmployee
              }))
            }
          ],
          services: [
            {
              ...secondService,
              isMainServiceForReservation: true,
              detergentsCost: secondService.detergentsCost!.toString(),
              reservationId: secondReservation.id,
              unit: null
            }
          ]
        }
      ]);
    });
  });

  describe('POST /', () => {
    it('should return 400 if body is empty', async () => {
      const { status, body } = await request(app).post(`/reservations`);

      expect(status).toBe(400);
      expect(body).toStrictEqual(
        expect.objectContaining({
          message: 'Error when parsing data type'
        })
      );
    });

    it('should return 400 if body is missing required fields', async () => {
      const { status, body } = await request(app)
        .post(`/reservations`)
        .send({
          client: {
            firstName: 'John',
            lastName: 'Doe',
            email: ''
          }
        });
      expect(status).toBe(400);
      expect(body).toStrictEqual(
        expect.objectContaining({
          message: 'Error when parsing data type'
        })
      );
    });

    it('should return 201 and create reservation with single visit properly', async () => {
      const exampleData = await getExampleData();

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });
    });

    it('should return 201 and create reservation with monthly visits properly', async () => {
      const exampleData = await getExampleData({
        frequency: Frequency.ONCE_A_MONTH
      });

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });

      const visits = await prisma.visit.findMany({
        where: {
          reservationId: body.id
        },
        include: {
          visitParts: true
        }
      });

      expect(visits).toHaveLength(13);

      visits.forEach((visit, i) => {
        visit.visitParts.forEach((visitPart, j) => {
          expect(visitPart.startDate).toStrictEqual(
            advanceDateByMonths(exampleData.visitParts[j]?.startDate, i)
          );
          expect(visitPart.endDate).toStrictEqual(
            advanceDateByMonths(exampleData.visitParts[j]?.endDate, i)
          );
        });
      });
    });

    it('should return 201 and create reservation with fortnightly visits properly', async () => {
      const exampleData = await getExampleData({
        frequency: Frequency.EVERY_TWO_WEEKS
      });

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });

      const visits = await prisma.visit.findMany({
        where: {
          reservationId: body.id
        },
        include: {
          visitParts: true
        }
      });

      expect(visits).toHaveLength(27);

      visits.forEach((visit, i) => {
        visit.visitParts.forEach((visitPart, j) => {
          expect(visitPart.startDate).toStrictEqual(
            advanceDateByWeeks(exampleData.visitParts[j]?.startDate, 2 * i)
          );
          expect(visitPart.endDate).toStrictEqual(
            advanceDateByWeeks(exampleData.visitParts[j]?.endDate, 2 * i)
          );
        });
      });
    });

    it('should return 201 and create reservation with weekly visits properly', async () => {
      const exampleData = await getExampleData({
        frequency: Frequency.ONCE_A_WEEK
      });

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });

      const visits = await prisma.visit.findMany({
        where: {
          reservationId: body.id
        },
        include: {
          visitParts: true
        }
      });

      expect(visits).toHaveLength(53);

      visits.forEach((visit, i) => {
        visit.visitParts.forEach((visitPart, j) => {
          expect(visitPart.startDate).toStrictEqual(
            advanceDateByWeeks(exampleData.visitParts[j]?.startDate, i)
          );
          expect(visitPart.endDate).toStrictEqual(
            advanceDateByWeeks(exampleData.visitParts[j]?.endDate, i)
          );
        });
      });
    });

    it('should return 200 and handle creation after holidays properly', async () => {
      const exampleData = await getExampleData({
        frequency: Frequency.ONCE_A_MONTH
      });

      const sendData = {
        ...exampleData,
        visitParts: [
          {
            ...exampleData.visitParts[0],
            startDate: '2023-11-25T10:00:00.000Z',
            endDate: '2023-11-25T14:00:00.000Z'
          }
        ]
      };

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(sendData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });

      const visits = await prisma.visit.findMany({
        where: {
          reservationId: body.id
        },
        include: {
          visitParts: true
        }
      });

      expect(visits).toHaveLength(13);

      const holidayVisits = visits.filter((visit) =>
        visit.visitParts.some(
          (visitPart) =>
            (visitPart.startDate.toISOString() === '2023-12-25T10:00:00.000Z' ||
              visitPart.startDate.toISOString() ===
                '2023-12-26T10:00:00.000Z') &&
            (visitPart.endDate.toISOString() === '2023-12-25T10:00:00.000Z' ||
              visitPart.endDate.toISOString() === '2023-12-26T10:00:00.000Z')
        )
      );

      expect(holidayVisits).toHaveLength(0);

      const movedVisit = visits.find((visit) =>
        visit.visitParts.some(
          (visitPart) =>
            visitPart.startDate.toISOString() === '2023-12-27T10:00:00.000Z' &&
            visitPart.endDate.toISOString() === '2023-12-27T14:00:00.000Z'
        )
      );

      expect(movedVisit).toBeDefined();
    });

    it('should return 400 if there is conflicting reservation', async () => {
      const { employee, service } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-02-02T11:00:00.000Z',
        firstVisitEndDate: '2024-02-02T15:00:00.000Z'
      });

      const exampleData = await getExampleData(
        {
          frequency: Frequency.ONCE_A_MONTH
        },
        employee.id,
        service.id
      );

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        message:
          'Cannot create reservation because of conflicting dates with other reservations'
      });
    });

    it('should return 201 and create reservation if conflicting with closed visit parts', async () => {
      const { employee, service, visits } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-02-02T11:00:00.000Z',
        firstVisitEndDate: '2024-02-02T15:00:00.000Z'
      });

      await prisma.visitPart.updateMany({
        where: {
          visitId: {
            in: visits.map((visit) => visit.id)
          }
        },
        data: {
          status: Status.CLOSED
        }
      });

      const exampleData = await getExampleData(
        {
          frequency: Frequency.ONCE_A_MONTH
        },
        employee.id,
        service.id
      );

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });
    });

    it('should return 201 and create reservation if conflicting with cancelled visit parts', async () => {
      const { employee, service, visits } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-02-02T11:00:00.000Z',
        firstVisitEndDate: '2024-02-02T15:00:00.000Z'
      });

      await prisma.visitPart.updateMany({
        where: {
          visitId: {
            in: visits.map((visit) => visit.id)
          }
        },
        data: {
          status: Status.CANCELLED
        }
      });

      const exampleData = await getExampleData(
        {
          frequency: Frequency.ONCE_A_MONTH
        },
        employee.id,
        service.id
      );

      const { status, body } = await request(app)
        .post(`/reservations`)
        .send(exampleData);

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        extraInfo: null,
        name: expect.stringContaining('reservation-'),
        bookerFirstName: exampleData.contactDetails.firstName,
        bookerLastName: exampleData.contactDetails.lastName,
        bookerEmail: exampleData.bookerEmail,
        frequency: exampleData.frequency,
        addressId: expect.any(Number)
      });
    });
  });

  describe('GET /:name', () => {
    it('should return 200 with reservation data if found', async () => {
      const { reservation, visit, employee, service } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE,
          firstVisitStartDate: '2024-01-02T10:00:00.000Z',
          firstVisitEndDate: '2024-01-02T14:00:00.000Z'
        });

      const { status, body } = await request(app).get(
        `/reservations/${reservation.name}`
      );

      expect(status).toBe(200);

      expect(body).toStrictEqual({
        ...reservation,
        frequency: Frequency.ONCE,
        visits: [
          {
            ...visit,
            detergentsCost: visit.detergentsCost.toString(),
            visitParts: visit.visitParts.map((visitPart) => ({
              ...visitPart,
              startDate: visitPart.startDate.toISOString(),
              endDate: visitPart.endDate.toISOString(),
              cost: visitPart.cost.toString(),
              employee
            }))
          }
        ],
        services: [
          {
            ...service,
            isMainServiceForReservation: true,
            detergentsCost: service.detergentsCost!.toString(),
            reservationId: reservation.id,
            unit: null
          }
        ]
      });
    });

    it('should return 404 if reservation not found', async () => {
      const { status, body } = await request(app).get(`/reservations/1`);

      expect(status).toBe(404);
      expect(body).toStrictEqual({
        message: `Reservation with name=1 not found`
      });
    });
  });
  describe('PUT /:name/confirm', () => {
    it('should return 200 and confirm reservation if employee', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const { reservation, visits, service, employee } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE,
          firstVisitStartDate: '2024-01-02T10:00:00.000Z',
          firstVisitEndDate: '2024-01-02T14:00:00.000Z'
        });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/confirm`)
        .send({ employeeId: employee.id })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...reservation,
        frequency: Frequency.ONCE,
        visits: visits.map((visit) => ({
          ...visit,
          detergentsCost: visit.detergentsCost.toString(),
          visitParts: visit.visitParts.map((visitPart) => ({
            ...visitPart,
            startDate: visitPart.startDate.toISOString(),
            endDate: visitPart.endDate.toISOString(),
            cost: visitPart.cost.toString(),
            employee
          }))
        })),
        services: [
          {
            ...service,
            isMainServiceForReservation: true,
            detergentsCost: service.detergentsCost!.toString(),
            reservationId: reservation.id,
            unit: null
          }
        ]
      });
    });

    it('should return 403 if not an employee', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      const { reservation, employee } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z'
      });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/confirm`)
        .send({ employeeId: employee.id })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(403);
      expect(body).toStrictEqual({
        message: 'Cannot access resource with given permissions'
      });
    });

    it('should return 400 if employee id not provided', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const { reservation } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z'
      });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/confirm`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(400);
      expect(body).toHaveProperty('message', 'Error when parsing data type');
    });

    it('should return 404 if reservation not found', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const employee = await prisma.employee.create({
        data: {
          ...employeeFixture()
        }
      });

      const { status, body } = await request(app)
        .put(`/reservations/name/confirm`)
        .send({ employeeId: employee.id })
        .set('Cookie', 'authToken=token');

      expect(status).toBe(404);
      expect(body).toEqual({ message: `Reservation with name=name not found` });
    });
  });

  describe('PUT /:name/cancel', () => {
    it('should return 403 if not a client', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const { reservation } = await createMockDatabaseStructure({
        frequency: Frequency.ONCE,
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z'
      });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/cancel`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(403);
      expect(body).toStrictEqual({
        message: 'Cannot access resource with given permissions'
      });
    });

    it('should return 200 and cancel visits for free if their start date is at least 24 hours from now', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-11T10:00:00.000Z'));

      const { reservation, visits, service, employee } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T14:00:00.000Z'
        });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/cancel`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...reservation,
        frequency: Frequency.ONCE,
        visits: visits.map((visit) => ({
          ...visit,
          canDateBeChanged: false,
          detergentsCost: '0',
          visitParts: visit.visitParts.map((visitPart) => ({
            ...visitPart,
            startDate: visitPart.startDate.toISOString(),
            endDate: visitPart.endDate.toISOString(),
            status: Status.CANCELLED,
            cost: '0',
            employee
          }))
        })),
        services: [
          {
            ...service,
            isMainServiceForReservation: true,
            detergentsCost: service.detergentsCost!.toString(),
            reservationId: reservation.id,
            unit: null
          }
        ]
      });
    });

    it('should return 200 and cancel visits for half of their prive if their start date is at most 24 hours from now', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-11T10:01:00.000Z'));

      const { reservation, visits, service, employee } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T14:00:00.000Z'
        });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/cancel`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...reservation,
        frequency: Frequency.ONCE,
        visits: visits.map((visit) => ({
          ...visit,
          canDateBeChanged: false,
          detergentsCost: '0',
          visitParts: visit.visitParts.map((visitPart) => ({
            ...visitPart,
            startDate: visitPart.startDate.toISOString(),
            endDate: visitPart.endDate.toISOString(),
            status: Status.CANCELLED,
            cost: `${visitPart.cost.toNumber() / 2}`,
            employee
          }))
        })),
        services: [
          {
            ...service,
            isMainServiceForReservation: true,
            detergentsCost: service.detergentsCost!.toString(),
            reservationId: reservation.id,
            unit: null
          }
        ]
      });
    });

    it('should return 200 and cancel only future visits and charge for them properly', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      const mockNow = new Date('2024-03-11T10:01:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);

      const { reservation, visits, service, employee } =
        await createMockDatabaseStructure({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T14:00:00.000Z'
        });

      const { status, body } = await request(app)
        .put(`/reservations/${reservation.name}/cancel`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...reservation,
        frequency: Frequency.ONCE_A_MONTH,
        visits: visits.map((visit) => ({
          ...visit,
          canDateBeChanged: false,
          detergentsCost: '0',
          visitParts: visit.visitParts.map((visitPart) => {
            visitPart.startDate = new Date(visitPart.startDate);
            let cost = `${visitPart.cost.toNumber() / 2}`;
            if (isAtLeastOneDayBetween(mockNow, visitPart.startDate))
              cost = '0';

            if (isBefore(visitPart.startDate, mockNow))
              cost = visitPart.cost.toString();

            return {
              ...visitPart,
              startDate: visitPart.startDate.toISOString(),
              endDate: visitPart.endDate.toISOString(),
              status: isBefore(visitPart.startDate, mockNow)
                ? visitPart.status
                : Status.CANCELLED,
              cost,
              employee
            };
          })
        })),
        services: [
          {
            ...service,
            isMainServiceForReservation: true,
            detergentsCost: service.detergentsCost!.toString(),
            reservationId: reservation.id,
            unit: null
          }
        ]
      });
    });
  });
});
