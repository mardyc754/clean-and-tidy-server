import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import App from '~/App';
import resetDb from '~/tests/resetDb';

import AddressController from '../AddressController';

describe('/address', () => {
  const app = new App([new AddressController()]).instance;
  afterEach(async () => {
    await resetDb();
  });

  describe('POST /check', () => {
    it('should return 200 with address if post code is found', async () => {
      const { status, body } = await request(app)
        .post('/addresses/check')
        .send({
          postCode: '31-526',
          street: 'ul. Księdza Piotra Ściegiennego',
          houseNumber: '3'
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        postCode: '31-526',
        street: 'ul. Księdza Piotra Ściegiennego',
        houseNumber: '3'
      });
    });

    it('should return 404 otherwise', async () => {
      const { status, body } = await request(app)
        .post('/addresses/check')
        .send({
          postCode: '12-345',
          street: 'ul. Księdza Piotra Ściegiennego',
          houseNumber: '3'
        });

      expect(status).toBe(404);
      expect(body).toStrictEqual({ message: 'Invalid post code' });
    });
  });
});
