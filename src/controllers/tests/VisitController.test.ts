import { Frequency, Status } from '@prisma/client';
import request from 'supertest';
import { afterEach, describe, vi } from 'vitest';
import { expect, it } from 'vitest';
import App from '~/App';
import { createMockDatabaseStructure } from '~/tests/helpers/createEmployeeWithReservation';
import resetDb from '~/tests/resetDb';

import { Scheduler } from '~/utils/Scheduler';
import { advanceDateByMinutes, minutesBetween } from '~/utils/dateUtils';

import VisitController from '../VisitController';

describe('/visits', () => {
  const app = new App([new VisitController()]).instance;
  afterEach(async () => {
    await resetDb();
    vi.useRealTimers();
  });

  describe('GET /:id', () => {
    it('should return 200 with visit  data if found', async () => {
      const { visit, employee } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const { status, body } = await request(app).get(`/visits/${visit.id}`);

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...visit,
        detergentsCost: visit.detergentsCost.toString(),
        visitParts: visit.visitParts.map((visitPart) => ({
          ...visitPart,
          cost: visitPart.cost.toString(),
          startDate: visitPart.startDate.toISOString(),
          endDate: visitPart.endDate.toISOString(),
          employee
        }))
      });
    });

    it('should return 404 if visit not found', async () => {
      const { status, body } = await request(app).get(`/visits/1`);

      expect(status).toBe(404);
      expect(body).toStrictEqual({ message: `Visit with id=1 not found` });
    });
  });

  describe('PUT /:id', () => {
    it('should return 404 if visit not found', async () => {
      const { status, body } = await request(app)
        .put(`/visits/1`)
        .send({ startDate: '2024-01-02T10:00:00.000Z' });

      expect(status).toBe(404);
      expect(body).toStrictEqual({ message: `Visit with id=1 not found` });
    });

    it('should return 400 if start date format is wrong', async () => {
      const { visit } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const { status, body } = await request(app)
        .put(`/visits/${visit.id}`)
        .send({ startDate: '123123123' });

      expect(status).toBe(400);
      expect(body).toHaveProperty('message', 'Error when parsing data type');
    });

    it('should return 200 if new start at most 7 days later', async () => {
      const { visit, employee } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const { status, body } = await request(app)
        .put(`/visits/${visit.id}`)
        .send({ startDate: '2024-01-09T09:30:00.000Z' });

      const newOldStartDateDifference = minutesBetween(
        '2024-01-02T10:00:00.000Z',
        '2024-01-09T09:30:00.000Z'
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...visit,
        canDateBeChanged: false,
        detergentsCost: visit.detergentsCost.toString(),
        visitParts: visit.visitParts.map((visitPart) => ({
          ...visitPart,
          cost: visitPart.cost.toString(),
          status: Status.TO_BE_CONFIRMED,
          startDate: advanceDateByMinutes(
            visitPart.startDate,
            newOldStartDateDifference
          ).toISOString(),
          endDate: advanceDateByMinutes(
            visitPart.endDate,
            newOldStartDateDifference
          ).toISOString(),
          employee
        }))
      });
    });

    it('should return 400 if visit start date is at least 7 days later', async () => {
      const { visit } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      const { status, body } = await request(app)
        .put(`/visits/${visit.id}`)
        .send({ startDate: '2024-01-09T10:00:00.000Z' });

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        message:
          'New visit start date should be at most 7 days later from the initial one'
      });
    });

    it('should return 400 if visit date was already changed', async () => {
      const { visit } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      await request(app)
        .put(`/visits/${visit.id}`)
        .send({ startDate: '2024-01-04T14:00:00.000Z' });

      const { status, body } = await request(app)
        .put(`/visits/${visit.id}`)
        .send({ startDate: '2024-01-05T14:00:00.000Z' });

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        message:
          'Cannot change the date of a visit because it has been already changed'
      });
    });
  });

  describe('PUT /:id/cancel', () => {
    it('should return 404 if visit not found', async () => {
      const { status, body } = await request(app).put(`/visits/1/cancel`);

      expect(status).toBe(404);
      expect(body).toStrictEqual({ message: `Visit with id=1 not found` });
    });

    it('should return 200 and visit with half-reduced costs if cancelled at most 24h before the start date', async () => {
      vi.spyOn(Scheduler.getInstance(), 'cancelJob');

      const { visit, employee } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      vi.useFakeTimers();
      vi.setSystemTime('2024-01-01T10:00:01.000Z');

      const { status, body } = await request(app).put(
        `/visits/${visit.id}/cancel`
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...visit,
        canDateBeChanged: false,
        detergentsCost: `${visit.detergentsCost.toNumber() / 2}`,
        visitParts: visit.visitParts.map((visitPart) => ({
          ...visitPart,
          cost: `${visitPart.cost.toNumber() / 2}`,
          status: Status.CANCELLED,
          startDate: visitPart.startDate.toISOString(),
          endDate: visitPart.endDate.toISOString(),
          employee
        }))
      });

      visit.visitParts.forEach((visitPart) => {
        expect(Scheduler.getInstance().cancelJob).toHaveBeenCalledWith(
          `${visitPart.id}`
        );
      });
    });

    it('should cancel visit for free if cancelled at least 24 hrs before', async () => {
      const { visit, employee } = await createMockDatabaseStructure({
        firstVisitStartDate: '2024-01-02T10:00:00.000Z',
        firstVisitEndDate: '2024-01-02T14:00:00.000Z',
        frequency: Frequency.ONCE
      });

      vi.useFakeTimers();
      vi.setSystemTime('2024-01-01T09:59:59.000Z');

      const { status, body } = await request(app).put(
        `/visits/${visit.id}/cancel`
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        ...visit,
        canDateBeChanged: false,
        detergentsCost: '0',
        visitParts: visit.visitParts.map((visitPart) => ({
          ...visitPart,
          cost: '0',
          status: Status.CANCELLED,
          startDate: visitPart.startDate.toISOString(),
          endDate: visitPart.endDate.toISOString(),
          employee
        }))
      });
    });
  });
});
