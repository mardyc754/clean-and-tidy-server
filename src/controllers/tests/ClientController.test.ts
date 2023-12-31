import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import App from '~/App';
import resetDb from '~/tests/resetDb';

import ClientController from '../ClientController';

const app = new App([new ClientController()]).instance;

describe('/clients', () => {
  afterEach(async () => {
    await resetDb();
  });

  describe('GET /', () => {
    it('should return all clients', async () => {
      const response = await request(app).get('/clients');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

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

      const response = await request(app).get('/clients');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([expectedClient]);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
