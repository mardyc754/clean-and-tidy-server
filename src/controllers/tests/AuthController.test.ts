import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { omit } from 'lodash';
import request from 'supertest';
import { afterEach, describe, vi } from 'vitest';
import { expect, it } from 'vitest';
import App from '~/App';
import { clientFixture, employeeFixture } from '~/tests/helpers/fixtures';
import prisma from '~/tests/prisma';
import resetDb from '~/tests/resetDb';

import { UserRole } from '~/constants';

import AuthController from '../AuthController';

describe('/auth', () => {
  const app = new App([new AuthController()]).instance;
  afterEach(async () => {
    await resetDb();
    vi.resetAllMocks();
  });

  describe('POST /register', () => {
    it('should return 409 if client with given email already exists', async () => {
      const client = await prisma.client.create({
        data: {
          ...clientFixture()
        }
      });

      const { status, body } = await request(app).post('/auth/register').send({
        email: client.email,
        password: 'password'
      });

      expect(status).toBe(409);
      expect(body).toStrictEqual({
        message: 'User with given email already exists',
        affectedField: 'email'
      });
    });

    it('should return 409 if employee with given email already exists', async () => {
      const employeeData = employeeFixture();

      const employee = await prisma.employee.create({
        data: {
          ...employeeData
        }
      });

      const { status, body } = await request(app).post('/auth/register').send({
        email: employee.email,
        password: 'password'
      });

      expect(status).toBe(409);
      expect(body).toStrictEqual({
        message: 'User with given email already exists',
        affectedField: 'email'
      });
    });

    it('should return 200 if user was created successfully', async () => {
      const clientEmail = faker.internet.email();
      const { status, body } = await request(app).post('/auth/register').send({
        email: clientEmail,
        password: 'password'
      });

      expect(status).toBe(201);
      expect(body).toStrictEqual({
        id: expect.any(Number),
        email: clientEmail,
        message: 'Client created succesfully'
      });
    });

    it('should return 400 if password is too long', async () => {
      const clientEmail = faker.internet.email();
      const { status, body } = await request(app)
        .post('/auth/register')
        .send({
          email: clientEmail,
          password: 'verylongpassword'.repeat(10)
        });

      expect(status).toBe(400);
      expect(body).toStrictEqual(
        expect.objectContaining({ message: 'Error when parsing data type' })
      );
    });
  });

  describe('POST /login', () => {
    it('should return 404 if user with given email does not exist', async () => {
      const email = faker.internet.email();
      const { status, body } = await request(app).post('/auth/login').send({
        email: email,
        password: 'password'
      });

      expect(status).toBe(404);
      expect(body).toStrictEqual({
        message: 'User with given email does not exist',
        affectedField: 'email'
      });
    });

    it('should return 400 if password is incorrect', async () => {
      const email = faker.internet.email();

      await prisma.client.create({
        data: {
          ...clientFixture(),
          password: bcrypt.hashSync('password', 8),
          email
        }
      });

      const { status, body } = await request(app).post('/auth/login').send({
        email,
        password: 'wrongpassword'
      });

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        message: 'Invalid password',
        affectedField: 'password'
      });
    });

    it('should return 200 if client was logged in successfully', async () => {
      const email = faker.internet.email();

      const user = await prisma.client.create({
        data: {
          ...clientFixture(),
          password: bcrypt.hashSync('password', 8),
          email
        }
      });

      const { status, body, headers } = await request(app)
        .post('/auth/login')
        .send({
          email,
          password: 'password'
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        message: 'Logged in successfully',
        isAuthenticated: true,
        role: UserRole.CLIENT,
        userId: user.id,
        email: user.email
      });

      expect(headers['set-cookie']).toContainEqual(
        expect.stringContaining('authToken')
      );
    });

    it('should return 200 if employee was logged in successfully', async () => {
      const email = faker.internet.email();

      const user = await prisma.employee.create({
        data: {
          ...employeeFixture(),
          password: bcrypt.hashSync('password', 8),
          email
        }
      });

      const { status, body, headers } = await request(app)
        .post('/auth/login')
        .send({
          email,
          password: 'password'
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        message: 'Logged in successfully',
        isAuthenticated: true,
        role: UserRole.EMPLOYEE,
        userId: user.id,
        email: user.email
      });

      expect(headers['set-cookie']).toContainEqual(
        expect.stringContaining('authToken')
      );
    });

    it('should return 200 if admin was logged in successfully', async () => {
      const email = faker.internet.email();

      const user = await prisma.employee.create({
        data: {
          ...employeeFixture(),
          password: bcrypt.hashSync('password', 8),
          email,
          isAdmin: true
        }
      });

      const { status, body, headers } = await request(app)
        .post('/auth/login')
        .send({
          email,
          password: 'password'
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        message: 'Logged in successfully',
        isAuthenticated: true,
        role: UserRole.ADMIN,
        userId: user.id,
        email: user.email
      });

      expect(headers['set-cookie']).toBeDefined();
      expect(headers['set-cookie']).toContainEqual(
        expect.stringContaining('authToken')
      );
    });

    describe('POST /logout', () => {
      it('should return 401 if user is not logged in', async () => {
        const { status, body } = await request(app).post('/auth/logout');

        expect(status).toBe(401);
        expect(body).toStrictEqual({
          message: 'Credentials were not provided'
        });
      });

      it('should return 200 if user was logged out successfully', async () => {
        vi.spyOn(jwt, 'verify').mockImplementation(() => ({
          role: UserRole.EMPLOYEE
        }));

        const { status, body, headers } = await request(app)
          .post('/auth/logout')
          .set('Cookie', ['authToken=token']);

        expect(status).toBe(200);
        expect(body).toStrictEqual({
          isAuthenticated: false,
          message: 'Logged out successfully'
        });

        expect(headers['set-cookie']).toContainEqual(
          expect.stringContaining('authToken=;')
        );
      });
    });

    describe('GET /user', () => {
      it('should return 200 with empty object if user not logged in', async () => {
        const { status, body } = await request(app).get('/auth/user');

        expect(status).toBe(200);
        expect(body).toStrictEqual({});
      });

      it('should return 200 with user data if user is logged in', async () => {
        const email = faker.internet.email();
        const user = await prisma.employee.create({
          data: {
            ...employeeFixture(),
            email
          }
        });

        vi.spyOn(jwt, 'verify').mockImplementation(() => ({
          role: UserRole.EMPLOYEE,
          userId: user.id
        }));

        const { status, body } = await request(app).get('/auth/user');

        expect(status).toBe(200);
        expect(body).toStrictEqual({
          role: UserRole.EMPLOYEE,
          ...omit(user, 'password', 'isAdmin')
        });
      });

      it('should return 404 if user with given id and role does not exist (client to employee)', async () => {
        const email = faker.internet.email();
        const user = await prisma.employee.create({
          data: {
            ...employeeFixture(),
            email
          }
        });

        vi.spyOn(jwt, 'verify').mockImplementation(() => ({
          role: UserRole.CLIENT,
          userId: user.id
        }));

        const { status, body } = await request(app).get('/auth/user');

        expect(status).toBe(404);
        expect(body).toStrictEqual({
          message: `User with id=${user.id} and role=${UserRole.CLIENT} does not exist`
        });
      });

      it('should return 404 if user with given id and role does not exist (employee to client)', async () => {
        const email = faker.internet.email();
        const user = await prisma.client.create({
          data: {
            ...clientFixture(),
            email
          }
        });

        vi.spyOn(jwt, 'verify').mockImplementation(() => ({
          role: UserRole.EMPLOYEE,
          userId: user.id
        }));

        const { status, body } = await request(app).get('/auth/user');

        expect(status).toBe(404);
        expect(body).toStrictEqual({
          message: `User with id=${user.id} and role=${UserRole.EMPLOYEE} does not exist`
        });
      });
    });

    describe('PUT /user', () => {
      it('should return 200 with empty object if user not logged in', async () => {
        const { status, body } = await request(app).put('/auth/user').send({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: '123456789'
        });

        expect(status).toBe(200);
        expect(body).toStrictEqual({});
      });

      it('should return 200 with updated user data if user is logged in (client case)', async () => {
        const email = faker.internet.email();
        const user = await prisma.client.create({
          data: {
            ...clientFixture(),
            email
          }
        });

        vi.spyOn(jwt, 'verify').mockImplementation(() => ({
          role: UserRole.CLIENT,
          userId: user.id
        }));

        const newData = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: '123456789'
        };

        const { status, body } = await request(app)
          .put('/auth/user')
          .send(newData);

        expect(status).toBe(200);
        expect(body).toStrictEqual({
          role: UserRole.CLIENT,
          ...omit(user, 'password', 'isAdmin'),
          ...newData
        });
      });
    });

    it('should return 200 with updated user data if user is logged in (employee case)', async () => {
      const email = faker.internet.email();
      const user = await prisma.employee.create({
        data: {
          ...employeeFixture(),
          email
        }
      });

      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE,
        userId: user.id
      }));

      const newData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789'
      };

      const { status, body } = await request(app)
        .put('/auth/user')
        .send(newData);

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        role: UserRole.EMPLOYEE,
        ...omit(user, 'password', 'isAdmin'),
        ...newData
      });
    });

    it('should return 404 if user with given id and role does not exist (client to employee)', async () => {
      const email = faker.internet.email();
      const user = await prisma.employee.create({
        data: {
          ...employeeFixture(),
          email
        }
      });

      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT,
        userId: user.id
      }));

      const { status, body } = await request(app).put('/auth/user').send({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789'
      });

      expect(status).toBe(404);
      expect(body).toStrictEqual({
        message: `User with id=${user.id} and role=${UserRole.CLIENT} does not exist`
      });
    });

    it('should return 404 if user with given id and role does not exist (employee to client)', async () => {
      const email = faker.internet.email();
      const user = await prisma.client.create({
        data: {
          ...clientFixture(),
          email
        }
      });

      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE,
        userId: user.id
      }));

      const { status, body } = await request(app).put('/auth/user').send({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: '123456789'
      });

      expect(status).toBe(404);
      expect(body).toStrictEqual({
        message: `User with id=${user.id} and role=${UserRole.EMPLOYEE} does not exist`
      });
    });

    it('should return 400 if wrong update data', async () => {
      const email = faker.internet.email();
      const user = await prisma.employee.create({
        data: {
          ...employeeFixture(),
          email
        }
      });

      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT,
        userId: user.id
      }));

      const { status, body } = await request(app).put('/auth/user').send({
        isAdmin: true
      });

      expect(status).toBe(400);
      expect(body).toStrictEqual(
        expect.objectContaining({ message: 'Error when parsing data type' })
      );
    });
  });
});
