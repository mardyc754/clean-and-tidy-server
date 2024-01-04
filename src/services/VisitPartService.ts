import { Reservation, Status, type Visit, VisitPart } from '@prisma/client';
import { omit } from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';

import prisma from '~/lib/prisma';

import { isAtLeastOneDayBetween } from '~/utils/dateUtils';

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
    return await prisma.$transaction(async (tx) => {
      const oldVisitPart = await tx.visitPart.findUnique({
        where: { id }
      });

      if (!oldVisitPart) {
        return null;
      }

      const canceledVisitPart = await tx.visitPart.update({
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
      });

      return canceledVisitPart
        ? {
            ...omit(canceledVisitPart, 'employeeService', 'visit'),
            includeDetergents: canceledVisitPart.visit.includeDetergents,
            employee: canceledVisitPart.employeeService.employee
          }
        : null;
    });
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
