import { Frequency } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { omit } from 'lodash';
import request from 'supertest';
import { afterEach, describe, vi } from 'vitest';
import { expect, it } from 'vitest';
import App from '~/App';
import { createMockDatabaseStructure } from '~/tests/helpers/createEmployeeWithReservation';
import { visitPartFixture } from '~/tests/helpers/fixtures';
import resetDb from '~/tests/resetDb';

import { UserRole } from '~/constants';

import prisma from '~/lib/prisma';

import VisitPartController from '../VisitPartController';

describe('/visit-parts', () => {
  const app = new App([new VisitPartController()]).instance;
  afterEach(async () => {
    await resetDb();
  });

  describe('GET /:id', () => {
    it('should return 200 with visit part data if found', async () => {
      const { visit, service, employee } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const visitPartData = visitPartFixture();
      const visitPart = await prisma.visitPart.create({
        data: {
          ...visitPartData,
          visit: {
            connect: {
              id: visit.id
            }
          },
          employee: {
            connect: {
              id: employee.id
            }
          },
          service: {
            connect: {
              id: service.id
            }
          }
        }
      });

      const { status, body } = await request(app).get(`/visit-parts/${visitPart.id}`);

      expect(status).toBe(200);
      expect(body).toStrictEqual(
        expect.objectContaining({
          ...visitPartData,
          employeeId: employee.id,
          serviceId: service.id,
          visitId: visit.id,
          employee: {
            ...omit(employee, 'password')
          }
        })
      );
    });

    it('should return 404 if visit part does not exist', async () => {
      const { status, body } = await request(app).get(`/visit-parts/1`);

      expect(status).toBe(404);
      expect(body).toStrictEqual({ message: `Visit part with id=1 not found` });
    });
  });

  describe('PUT /:id/cancel', () => {
    it('should return 403 if is not employee', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.CLIENT
      }));

      await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const { status } = await request(app)
        .put(`/visit-parts/1/cancel`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(403);
    });

    it('should return 400 if visit part does not exist', async () => {
      const { visit, service, employee } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const lastVisitPartId = visit.visitParts[visit.visitParts.length - 1]!.id;

      vi.spyOn(jwt, 'verify').mockImplementation(() => ({
        role: UserRole.EMPLOYEE
      }));

      const { status, body } = await request(app)
        .put(`/visit-parts/${lastVisitPartId + 1}/cancel`)
        .set('Cookie', 'authToken=token');

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        message: `Error when cancelling visit part`
      });
    });
  });
});
