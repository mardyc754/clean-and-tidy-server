import { faker } from '@faker-js/faker';
import { Frequency } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { omit, pick } from 'lodash';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '~/App';
import {
  createEmployeeWithReservationAndVisitParts,
  createMockReservation,
  createMockReservationEmployeeServiceData
} from '~/tests/helpers/createEmployeeWithReservation';
import {
  addressFixture,
  serviceFixture,
  visitPartFixture
} from '~/tests/helpers/fixtures';
import resetDb from '~/tests/resetDb';

import { UserRole } from '~/constants';

import prisma from '~/lib/prisma';

import ClientController from '../ClientController';
import EmployeeController from '../EmployeeController';

describe('/employees', () => {
  const app = new App([new ClientController(), new EmployeeController()])
    .instance;

  afterEach(async () => {
    await resetDb();
    vi.resetAllMocks();
  });

  describe('GET /', () => {
    it('returns 401 if there is no auth token cookie', async () => {
      const response = await request(app).get('/employees');

      expect(response.status).toBe(401);
    });

    it('gets all employees if requested so', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const response = await request(app)
        .get('/employees')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /', () => {
    it('returns 403 if  does not have admin permissions', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      const response = await request(app)
        .get('/employees')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(403);
    });

    it('returns created employee with status 201 if received proper data', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const password = faker.internet.password();
      const employeeCreationData = {
        email: faker.internet.email(),
        password,
        confirmPassword: password,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789'
      };

      const response = await request(app)
        .post('/employees')
        .set('Cookie', 'authToken=token')
        .send(employeeCreationData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        ...omit(employeeCreationData, 'password', 'confirmPassword'),
        isAdmin: false
      });
    });

    it('returns 409 if employee already exists in employee list', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const password = faker.internet.password();
      const employeeCreationData = {
        email: faker.internet.email(),
        password,
        confirmPassword: password,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789'
      };

      await request(app)
        .post('/employees')
        .set('Cookie', 'authToken=token')
        .send(employeeCreationData);

      const response = await request(app)
        .post('/employees')
        .set('Cookie', 'authToken=token')
        .send(employeeCreationData);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: 'User with given email already exists',
        affectedField: 'email'
      });
    });

    it('returns 409 if the client with given email already exists', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const email = faker.internet.email();
      const password = faker.internet.password();

      const employeeCreationData = {
        email,
        password,
        confirmPassword: password,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789'
      };

      await request(app).post('/clients').send({
        email
      });

      const response = await request(app)
        .post('/employees')
        .set('Cookie', 'authToken=token')
        .send(employeeCreationData);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: 'User with given email already exists',
        affectedField: 'email'
      });
    });
  });

  describe('GET /:id/reservations', () => {
    it('returns 403 if user is not an employee', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      const response = await request(app)
        .get('/employees/1/reservations')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(403);
    });

    it('returns an empty array if employee does not exist', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const response = await request(app)
        .get('/employees/1/reservations')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns 200 with reservations if employee exists', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const { employee, reservation } =
        await createEmployeeWithReservationAndVisitParts();

      const { status, body } = await request(app)
        .get(`/employees/${employee.id}/reservations`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toEqual([
        {
          ...reservation,
          addressId: expect.any(Number),
          id: expect.any(Number),
          visits: expect.any(Array),
          services: expect.any(Array),
          bookerEmail: null
        }
      ]);
    });
  });

  describe('GET /:id/visits', () => {
    it('returns 403 if user is not an employee', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      const response = await request(app)
        .get('/employees/1/visits')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(403);
    });

    it('returns an empty array if employee does not exist', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const response = await request(app)
        .get('/employees/1/visits')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns 200 with visit parts if employee exists', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const { employee, reservation } =
        await createEmployeeWithReservationAndVisitParts();

      const { status, body } = await request(app)
        .get(`/employees/${employee.id}/visits`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(200);
      expect(body).toStrictEqual([
        expect.objectContaining({
          ...visitPartFixture,
          employeeId: employee.id,
          reservation: expect.objectContaining({
            ...reservation,
            address: expect.objectContaining({
              ...addressFixture
            })
          }),
          service: expect.objectContaining({
            ...serviceFixture
          })
        })
      ]);
    });
  });

  describe('PUT /', () => {
    it('returns 403 if user is not an admin', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const response = await request(app)
        .put('/employees/1')
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(403);
    });

    it('returns 400 if has wrong request body', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const { status, body } = await request(app)
        .put('/employees/1')
        .set('Cookie', 'authToken=token')
        .send({
          firstName: faker.person.firstName(),
          // last name is missing
          phone: '123456789',
          isAdmin: true
        });

      expect(status).toBe(400);
      expect(body).toHaveProperty('message', 'Error when parsing data type');
    });

    it('returns 404 if employee with given id does not exist', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const { status, body } = await request(app)
        .put(`/employees/1`)
        .set('Cookie', 'authToken=token')
        .send({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: '123456789',
          isAdmin: true
        });

      expect(status).toBe(404);
      expect(body).toHaveProperty('message', 'Employee with id=1 not found');
    });

    it('returns 200 if employee data changed successfully', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const { employee } = await createEmployeeWithReservationAndVisitParts();

      const oldEmployeeData = pick(employee, [
        'id',
        'firstName',
        'lastName',
        'phone',
        'email',
        'isAdmin'
      ]);

      const serviceId = employee.services[0]!.serviceId;
      const newEmployeeData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789',
        isAdmin: true
      };

      const { status, body } = await request(app)
        .put(`/employees/${employee.id}`)
        .set('Cookie', 'authToken=token')
        .send({ ...newEmployeeData, services: [serviceId] });

      expect(status).toBe(200);
      expect(body).toEqual({
        ...oldEmployeeData,
        ...newEmployeeData
      });
    });

    it('returns 400 if trying to remove assigned service with assigned visit parts', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.ADMIN
      }));

      const { employee } = await createEmployeeWithReservationAndVisitParts();
      const newEmployeeData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789',
        isAdmin: true
      };

      const { status, body } = await request(app)
        .put(`/employees/${employee.id}`)
        .set('Cookie', 'authToken=token')
        .send({ ...newEmployeeData, services: [] });

      expect(status).toBe(400);
      expect(body).toEqual({
        message:
          'Cannot remove employee service because it is assigned to visit part'
      });
    });
  });

  describe('GET /busy-hours', () => {
    it('returns 200 with empty data if employee does not exist', async () => {
      const { status, body } = await request(app).get('/employees/busy-hours');

      expect(status).toBe(200);
      expect(body).toEqual({
        busyHours: [],
        employees: []
      });
    });

    it('returns proper data for busy hours for frequency once', async () => {
      const { employee, reservation, service } =
        await createMockReservationEmployeeServiceData({
          frequency: Frequency.ONCE,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      // this should not affect the result
      await createMockReservation({
        frequency: Frequency.ONCE,
        employeeId: employee.id,
        serviceId: service.id,
        firstVisitStartDate: '2024-02-12T10:00:00.000Z',
        firstVisitEndDate: '2024-02-12T11:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: { reservationId: reservation.id }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/employees/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          frequency: Frequency.ONCE,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual({
        busyHours: [
          {
            startDate: '2024-01-12T09:30:00.000Z',
            endDate: '2024-01-12T11:30:00.000Z'
          }
        ],
        employees: [
          {
            ...employee,
            services: [service.id],
            numberOfWorkingHours: 1.5,
            workingHours: [
              {
                startDate: '2024-01-12T09:30:00.000Z',
                endDate: '2024-01-12T11:30:00.000Z'
              }
            ]
          }
        ]
      });
    });

    it('returns proper data for cyclic reservation', async () => {
      const { employee, reservation, service } =
        await createMockReservationEmployeeServiceData({
          frequency: Frequency.ONCE_A_MONTH,
          firstVisitStartDate: '2024-01-12T10:00:00.000Z',
          firstVisitEndDate: '2024-01-12T11:00:00.000Z'
        });

      const {
        employee: secondEmployee,
        reservation: secondReservation,
        service: secondService
      } = await createMockReservationEmployeeServiceData({
        frequency: Frequency.ONCE_A_MONTH,
        firstVisitStartDate: '2024-02-14T10:00:00.000Z',
        firstVisitEndDate: '2024-02-14T11:00:00.000Z'
      });

      const reservationVisitIds = await prisma.visit
        .findMany({
          where: {
            reservationId: { in: [reservation.id, secondReservation.id] }
          }
        })
        .then((visits) => visits.map((visit) => visit.id));

      const { status, body } = await request(app)
        .get('/employees/busy-hours')
        .query({
          visitIds: reservationVisitIds.join(','),
          frequency: Frequency.ONCE_A_MONTH,
          period: '2024-0'
        });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          busyHours: [
            {
              endDate: '2024-01-11T11:30:00.000Z',
              startDate: '2024-01-11T09:30:00.000Z'
            },
            {
              endDate: '2024-01-12T11:30:00.000Z',
              startDate: '2024-01-12T09:30:00.000Z'
            },
            {
              endDate: '2024-01-14T11:30:00.000Z',
              startDate: '2024-01-14T09:30:00.000Z'
            }
          ],
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
                  endDate: '2024-01-14T11:30:00.000Z',
                  startDate: '2024-01-14T09:30:00.000Z'
                }
              ]
            })
          ]
        })
      );
    });
  });
});
