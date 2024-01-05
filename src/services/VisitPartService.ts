import { Reservation, Status, type Visit, VisitPart } from '@prisma/client';
import { omit } from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';

import { Scheduler } from '~/lib/Scheduler';
import prisma from '~/lib/prisma';

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
            includeDetergents: true
          }
        },
        employeeService: {
          include: { employee: true }
        }
      }
    });

    return visitPart
      ? {
          ...omit(visitPart, 'employeeService', 'visit'),
          includeDetergents: visitPart.visit.includeDetergents,
          employee: visitPart.employeeService.employee
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
            includeDetergents: true
          }
        },
        employeeService: {
          include: { employee: true }
        }
      }
    });

    Scheduler.getInstance()?.cancelVisitPartJob(canceledVisitPart.id);

    return {
      ...omit(canceledVisitPart, 'employeeService', 'visit'),
      includeDetergents: canceledVisitPart.visit.includeDetergents,
      employee: canceledVisitPart.employeeService.employee
    };
  }

  public async getVisitPartsByReservationId(
    reservationId: Reservation['id'],
    status?: Reservation['status']
  ) {
    return await prisma.visitPart.findMany({
      where: { visit: { reservationId }, status },
      include: {
        visit: {
          select: {
            includeDetergents: true
          }
        },
        employeeService: {
          include: { employee: true }
        }
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
            includeDetergents: true
          }
        },
        employeeService: {
          include: { employee: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
  }

  public async getVisitPartsFromReservations(
    reservationIds: Array<Reservation['id']>,
    status?: Reservation['status']
  ) {
    return await prisma.visitPart.findMany({
      where: { visit: { reservationId: { in: reservationIds } }, status },
      include: {
        visit: {
          select: {
            includeDetergents: true
          }
        },
        employeeService: {
          include: { employee: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
  }

  public async closeVisitPart(id: VisitPart['id']) {
    const closedVisitPart = await prisma.visitPart.update({
      where: { id },
      data: {
        status: Status.CLOSED
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
    });

    return closedVisitPart
      ? {
          ...omit(closedVisitPart, 'employeeService', 'visit'),
          includeDetergents: closedVisitPart.visit.includeDetergents,
          employee: closedVisitPart.employeeService.employee
        }
      : null;
  }

  public async closeVisitParts(visitPartIds: Array<VisitPart['id']>) {
    const payload = await prisma.visitPart.updateMany({
      where: { id: { in: visitPartIds } },
      data: {
        status: Status.CLOSED
      }
    });

    return payload?.count ?? 0;
  }
}
