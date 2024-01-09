import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '~/App';
import resetDb from '~/tests/resetDb';

import ClientController from '../ClientController';
import EmployeeController from '../EmployeeController';

vi.mock('jsonwebtoken', () => ({
  ...vi.importActual('jsonwebtoken'), // import and retain the original functionalities
  verify: vi.fn().mockReturnValue({ foo: 'bar' }) // overwrite verify
}));

// const verify = vi.spyOn(jwt, 'verify');
// verify.mockImplementation(() => () => ({ verified: 'true' }));

// jest.mock('jsonwebtoken', () => ({
//   verify: jest.fn((token, secretOrPublicKey, options, callback) => {
//     return callback(null, {sub: 'user_id'});
//   })
// }));

const app = new App([new ClientController(), new EmployeeController()])
  .instance;

describe('/employees', () => {
  afterEach(async () => {
    await resetDb();
  });

  describe('GET /employees', () => {
    it('gets all employees if requested so', async () => {
      const response = await request(app).get('/employees');

      expect(response.status).toBe(401);
    });

    it('gets all employees if requested so', async () => {
      const response = await request(app).get('/employees');

      expect(response.status).toBe(401);
    });
  });

  describe.skip('POST /', () => {});

  describe.skip('GET /:id/reservations', () => {});
});
