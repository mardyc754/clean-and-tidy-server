import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import App from '~/App';
import { employeeFixture } from '~/tests/helpers/fixtures';
import prisma from '~/tests/prisma';
import resetDb from '~/tests/resetDb';

import ClientController from '../ClientController';

describe('/clients', () => {
  const app = new App([new ClientController()]).instance;

  afterEach(async () => {
    await resetDb();
  });

  describe('POST /', () => {
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

      expect(createAnonymousClientResponse.status).toBe(201);
      expect(createAnonymousClientResponse.body).toStrictEqual(expectedClient);
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

      await prisma.client.create({
        data: {
          ...createAnonymousClientData
        }
      });

      const { status, body } = await request(app)
        .post('/clients')
        .send(createAnonymousClientData);

      expect(status).toBe(409);
      expect(body).toHaveProperty(
        'message',
        'User with given email already exists'
      );
      expect(body).toHaveProperty('affectedField', 'email');
    });

    it('should return 409 if employee with given email already existis', async () => {
      const createAnonymousClientData = {
        email: faker.internet.email()
      };

      // create employee with given email
      await prisma.employee.create({
        data: {
          ...employeeFixture(),
          email: createAnonymousClientData.email
        }
      });

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

      const createdClient = await prisma.client.create({
        data: {
          ...createAnonymousClientData
        }
      });

      const response = await request(app).get(
        `/clients/${createdClient.id}/reservations`
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
