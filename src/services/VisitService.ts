import { Status, type Visit, VisitPart } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import prisma from '~/lib/prisma';

import { ChangeVisitData } from '~/schemas/visit';

import { visitPartWithEmployee } from '~/queries/serviceQuery';

import { Scheduler } from '~/utils/Scheduler';
import {
  advanceDateByMinutes,
  isAtLeastOneDayBetween,
  isNewStartDateValid,
  minutesBetween
} from '~/utils/dateUtils';

export type VisitQueryOptions = RequireAtLeastOne<{
  includeEmployee: boolean;
}>;

export default class VisitService {
  public async getAllVisits() {
    return await prisma.visit.findMany();
  }

  public async getVisitById(id: VisitPart['id']) {
    return await prisma.visit.findUnique({
      where: { id },
      include: {
        visitParts: visitPartWithEmployee
      }
    });
  }

  public async changeVisitData(data: ChangeVisitData) {
    const { id, startDate } = data;

    return await prisma.$transaction(async (tx) => {
      const oldVisit = await tx.visit.findUnique({
        where: { id },
        include: {
          visitParts: visitPartWithEmployee
        }
      });

      if (!oldVisit) {
        return null;
      }

      const oldStartDate = oldVisit.visitParts[0]!.startDate;

      const newOldStartDateDifference = minutesBetween(oldStartDate, startDate);

      if (oldVisit.canDateBeChanged && newOldStartDateDifference !== 0) {
        throw new RequestError(
          'Cannot change the date of a visit because it has been already changed'
        );
      }

      if (!isNewStartDateValid(startDate, oldStartDate)) {
        throw new RequestError(
          'New visit start date should be at most 7 days later from the initial one'
        );
      }

      const visit = await tx.visit.update({
        where: { id },
        data: {
          canDateBeChanged:
            oldVisit.canDateBeChanged &&
            newOldStartDateDifference === 0 &&
            !oldVisit.visitParts.every(
              (visitPart) =>
                visitPart.status === Status.CLOSED ||
                visitPart.status === Status.CANCELLED
            ),
          visitParts: {
            update: oldVisit.visitParts.map((visitPart) => {
              const newStartDate = advanceDateByMinutes(
                visitPart.startDate,
                newOldStartDateDifference
              );
              const newEndDate = advanceDateByMinutes(
                visitPart.endDate,
                newOldStartDateDifference
              );
              return {
                where: { id: visitPart.id },
                data: {
                  status: Status.TO_BE_CONFIRMED,
                  startDate: newStartDate.toISOString(),
                  endDate: newEndDate.toISOString()
                }
              };
            })
          }
        },
        include: {
          visitParts: visitPartWithEmployee
        }
      });
      const visitData = visit;
      visitData.visitParts.forEach((visitPart) => {
        Scheduler.getInstance().rescheduleJob(
          `${visitPart.id}`,
          visitPart.endDate,
          () => {
            prisma.visitPart.update({
              where: { id: visitPart.id },
              data: { status: Status.CLOSED }
            });
          }
        );
      });

      return visitData;
    });
  }

  public async cancelVisit(id: Visit['id']) {
    return await prisma.$transaction(async (tx) => {
      const oldVisit = await tx.visit.findUnique({
        where: { id },
        include: {
          visitParts: visitPartWithEmployee
        }
      });

      if (!oldVisit) return null;
      const oldVisitData = oldVisit;

      const cancelledVisit = await tx.visit.update({
        where: { id },
        data: {
          detergentsCost: isAtLeastOneDayBetween(
            new Date(),
            oldVisitData.visitParts[0]!.startDate
          )
            ? 0
            : (oldVisitData.detergentsCost?.toNumber() ?? 0) / 2,
          canDateBeChanged: false,
          visitParts: {
            update: oldVisitData.visitParts.map((visitPart) => {
              return {
                where: { id: visitPart.id },
                data: {
                  status: Status.CANCELLED,
                  cost: isAtLeastOneDayBetween(new Date(), visitPart.startDate)
                    ? 0
                    : visitPart.cost.toNumber() / 2
                }
              };
            })
          }
        },
        include: {
          visitParts: visitPartWithEmployee
        }
      });

      if (!cancelledVisit) return null;

      const cancelledVisitData = cancelledVisit;
      cancelledVisitData.visitParts.map((visitPart) => {
        Scheduler.getInstance().cancelJob(`${visitPart.id}`);
      });

      return cancelledVisitData;
    });
  }
}
