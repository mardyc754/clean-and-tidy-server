import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import App from '~/App';
import resetDb from '~/tests/resetDb';

import ClientController from '../ClientController';
import EmployeeController from '../EmployeeController';

const app = new App([new ClientController(), new EmployeeController()])
  .instance;

describe('/clients', () => {
  afterEach(async () => {
    await resetDb();
  });

  describe('POST /', () => {
    // it('should return all clients', async () => {
    //   const response = await request(app).get('/clients');

    //   expect(response.status).toBe(200);
    //   expect(response.body.data).toEqual([]);
    // });

    it('should create anonymous client properly', async () => {
      const createAnonymousClientData = {
        email: 'test@xyz.com'
      };
      const expectedClient = {
        email: 'test@xyz.com',
        id: expect.any(Number),
        firstName: null,
        lastName: null,
        phone: null,
        password: null
      };

      const createAnonymousClientResponse = await request(app)
        .post('/clients')
        .send(createAnonymousClientData);

      const createdClientData = createAnonymousClientResponse.body;
      expect(createAnonymousClientResponse.status).toBe(201);
      expect(createAnonymousClientResponse.body).toStrictEqual(expectedClient);

      const response = await request(app).get(
        `/clients/${createdClientData.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual(createdClientData);
    });

    it('should return 400 when passing wrong data type', async () => {
      const createAnonymousClientData = {
        email: 1234
      };

      const createAnonymousClientResponse = await request(app)
        .post('/clients')
        .send(createAnonymousClientData);

      expect(createAnonymousClientResponse.status).toBe(400);
      expect(createAnonymousClientResponse.body).toHaveProperty(
        'message',
        'Error when parsing data type'
      );
    });

    it('should return 409 if client with given email already exists', async () => {
      const createAnonymousClientData = {
        email: 'test@xyz.com'
      };

      await request(app).post('/clients').send(createAnonymousClientData);

      const createConflictingClient = await request(app)
        .post('/clients')
        .send(createAnonymousClientData);

      expect(createConflictingClient.status).toBe(409);
      expect(createConflictingClient.body).toHaveProperty(
        'message',
        'User with given email already exists'
      );
      expect(createConflictingClient.body).toHaveProperty(
        'affectedField',
        'email'
      );
    });

    it('should return 409 if employee with given email already existis', async () => {
      const createAnonymousClientData = {
        email: faker.internet.email()
      };

      const password = faker.internet.password();

      const employeeRespose = await request(app).post('/employees').send({
        email: createAnonymousClientData.email,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        password,
        confirmPassword: password
      });

      expect(employeeRespose.status).toBe(201);

      const createConflictingClient = await request(app)
        .post('/clients')
        .send(createAnonymousClientData);

      expect(createConflictingClient.status).toBe(409);
      expect(createConflictingClient.body).toHaveProperty(
        'message',
        'User with given email already exists'
      );
      expect(createConflictingClient.body).toHaveProperty(
        'affectedField',
        'email'
      );
    });
  });

  describe('GET /:id/reservations', () => {
    it('should return empty list if there are no reservations', async () => {
      const createAnonymousClientData = {
        email: faker.internet.email()
      };

      const createAnonymousClientResponse = await request(app)
        .post('/clients')
        .send(createAnonymousClientData);

      const createdClientData = createAnonymousClientResponse.body;

      const response = await request(app).get(
        `/clients/${createdClientData.id}/reservations`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 404 if user does not exist', async () => {
      const response = await request(app).get(`/clients/1/reservations`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty(
        'message',
        'Client with id=1 not found'
      );
    });
  });
});
