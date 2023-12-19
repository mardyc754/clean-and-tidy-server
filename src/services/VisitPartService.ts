import { Status, type Visit, VisitPart } from '@prisma/client';
import { omit } from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

import { isAtLeastOneDayBetween } from '~/utils/dateUtils';

import { executeDatabaseOperation } from '../utils/queryUtils';

export type VisitQueryOptions = RequireAtLeastOne<{
  includeEmployee: boolean;
}>;

export default class VisitPartService {
  public async getAllVisits() {
    let visits: Visit[] | null = null;

    try {
      visits = await prisma.visit.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return visits;
  }

  public async getVisitPartById(id: VisitPart['id']) {
    const visitPart = await executeDatabaseOperation(
      prisma.visitPart.findFirst({
        where: { id },
        include: {
          visit: {
            select: {
              includeDetergents: true
            }
          },
          employeeService: {
            include: { employee: true }
          }
        }
      })
    );

    return visitPart
      ? {
          ...omit(visitPart, 'employeeService', 'visit'),
          includeDetergents: visitPart.visit.includeDetergents,
          employee: visitPart.employeeService.employee
        }
      : null;
  }

  public async cancelVisitPart(id: VisitPart['id']) {
    const oldVisitPart = await this.getVisitPartById(id);

    if (!oldVisitPart) {
      return null;
    }

    const canceledVisitPart = await executeDatabaseOperation(
      prisma.visitPart.update({
        where: { id },
        data: {
          status: Status.CANCELLED,
          cost: isAtLeastOneDayBetween(new Date(), oldVisitPart.startDate)
            ? 0
            : oldVisitPart.cost.toNumber() / 2
        },
        include: {
          visit: {
            select: {
              includeDetergents: true
            }
          },
          employeeService: {
            include: { employee: true }
          }
        }
      })
    );

    return canceledVisitPart
      ? {
          ...omit(canceledVisitPart, 'employeeService', 'visit'),
          includeDetergents: canceledVisitPart.visit.includeDetergents,
          employee: canceledVisitPart.employeeService.employee
        }
      : null;
  }
}