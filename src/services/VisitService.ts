import { Status, type Visit, VisitPart } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';
import { RequestError } from '~/errors/RequestError';

import prisma from '~/lib/prisma';

import { ChangeVisitData } from '~/schemas/visit';

import { visitPartWithEmployee } from '~/queries/serviceQuery';

import {
  advanceDateByMinutes,
  isAtLeastOneDayBetween,
  isNewStartDateValid,
  minutesBetween
} from '~/utils/dateUtils';
import { flattenNestedVisit } from '~/utils/visits';

export type VisitQueryOptions = RequireAtLeastOne<{
  includeEmployee: boolean;
}>;

export default class VisitService {
  public async getAllVisits() {
    return await prisma.visit.findMany();
  }

  public async getVisitById(id: VisitPart['id']) {
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        visitParts: visitPartWithEmployee
      }
    });

    return visit ? flattenNestedVisit(visit) : null;
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

      const oldVisitData = flattenNestedVisit(oldVisit);

      const oldStartDate = oldVisitData.visitParts[0]!.startDate;

      const newOldStartDateDifference = minutesBetween(oldStartDate, startDate);

      if (!oldVisitData.canDateBeChanged && newOldStartDateDifference !== 0) {
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
            oldVisitData.canDateBeChanged &&
            newOldStartDateDifference === 0 &&
            !oldVisitData.visitParts.every(
              (visitPart) =>
                visitPart.status === Status.CLOSED ||
                visitPart.status === Status.CANCELLED
            ),
          visitParts: {
            update: oldVisitData.visitParts.map((visitPart) => {
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

      return flattenNestedVisit(visit);
    });
  }

  public async deleteVisit(id: Visit['id']) {
    let deletedVisit: Visit | null = null;

    try {
      deletedVisit = await prisma.visit.delete({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return deletedVisit;
  }

  public async cancelVisit(id: Visit['id']) {
    return await prisma.$transaction(async (tx) => {
      const oldVisit = await tx.visit.findUnique({
        where: { id },
        include: {
          visitParts: visitPartWithEmployee
        }
      });

      const oldVisitData = oldVisit ? flattenNestedVisit(oldVisit) : null;

      if (!oldVisitData) {
        return null;
      }

      const canceledVisit = await tx.visit.update({
        where: { id },
        data: {
          includeDetergents: false,
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

      return canceledVisit ? flattenNestedVisit(canceledVisit) : null;
    });
  }
}
