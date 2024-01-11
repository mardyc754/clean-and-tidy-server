import { Reservation, Status, type Visit, VisitPart } from '@prisma/client';
import { omit } from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';

import prisma from '~/lib/prisma';

import { selectEmployee } from '~/queries/serviceQuery';

import { Scheduler } from '~/utils/Scheduler';

export type VisitQueryOptions = RequireAtLeastOne<{
  includeEmployee: boolean;
}>;

export default class VisitPartService {
  private readonly scheduler: Scheduler | undefined;

  constructor(scheduler?: Scheduler) {
    this.scheduler = scheduler;
  }

  public async getVisitPartById(id: VisitPart['id']) {
    const visitPart = await prisma.visitPart.findUnique({
      where: { id },
      include: {
        visit: {
          select: {
            detergentsCost: true
          }
        },
        employee: selectEmployee
      }
    });

    return visitPart
      ? {
          ...omit(visitPart, 'employeeService', 'visit'),
          includeDetergents: visitPart.visit.detergentsCost.toNumber() > 0,
          employee: omit(visitPart.employee, 'password')
        }
      : null;
  }

  public async cancelVisitPart(id: VisitPart['id']) {
    const canceledVisitPart = await prisma.visitPart.update({
      where: { id },
      data: {
        status: Status.CANCELLED,
        cost: 0
      },
      include: {
        visit: {
          select: {
            detergentsCost: true
          }
        },
        employee: selectEmployee
      }
    });

    Scheduler.getInstance()?.cancelJob(`${canceledVisitPart.id}`);

    return {
      ...omit(canceledVisitPart, 'employeeService', 'visit'),
      includeDetergents: canceledVisitPart.visit.detergentsCost.toNumber() > 0,
      employee: canceledVisitPart.employee
    };
  }

  public async getVisitPartsByReservationId(
    reservationId: Reservation['id'],
    status?: Status
  ) {
    return await prisma.visitPart.findMany({
      where: { visit: { reservationId }, status },
      include: {
        visit: {
          select: {
            detergentsCost: true
          }
        },
        employee: selectEmployee
      },
      orderBy: { startDate: 'asc' }
    });
  }

  public async getVisitPartsByVisitId(
    visitId: Visit['id'],
    status?: VisitPart['status']
  ) {
    return await prisma.visitPart.findMany({
      where: { visitId, status },
      include: {
        visit: {
          select: {
            detergentsCost: true
          }
        },

        employee: selectEmployee
      },
      orderBy: { startDate: 'asc' }
    });
  }

  public async getVisitPartsFromReservations(
    reservationIds: Array<Reservation['id']>,
    status?: Status
  ) {
    return await prisma.visitPart.findMany({
      where: { visit: { reservationId: { in: reservationIds } }, status },
      include: {
        visit: {
          select: {
            detergentsCost: true
          }
        },
        employee: selectEmployee
      },
      orderBy: { startDate: 'asc' }
    });
  }
}
