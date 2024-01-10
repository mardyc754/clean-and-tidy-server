import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import { omit } from 'lodash';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '~/App';
import { createEmployeeWithReservationAndVisitParts } from '~/tests/helpers/createEmployeeWithReservation';
import resetDb from '~/tests/resetDb';

import { UserRole } from '~/constants';

import ClientController from '../ClientController';
import EmployeeController from '../EmployeeController';

describe('/employees', () => {
  const app = new App([new ClientController(), new EmployeeController()])
    .instance;

  afterEach(async () => {
    await resetDb();
    vi.resetAllMocks();
  });

  describe('GET /employees', () => {
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

  describe('POST /employees', () => {
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

    it('returns 200 if employee exists', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const employee = await createEmployeeWithReservationAndVisitParts();

      console.log(employee);
      const response = await request(app)
        .get(`/employees/${employee.id}/reservations`)
        .set('Cookie', 'authToken=token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});
