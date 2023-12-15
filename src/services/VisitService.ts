import { Status, type Visit, VisitPart } from '@prisma/client';
import { omit } from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

import { ChangeVisitData, VisitPartCreationData } from '~/schemas/visit';

import { visitPartWithEmployee } from '~/queries/serviceQuery';

import {
  advanceDateByMinutes,
  isAtLeastOneDayBetween,
  isNewStartDateValid,
  minutesBetween
} from '~/utils/dateUtils';
import { flattenNestedVisit } from '~/utils/visits';

import { executeDatabaseOperation } from '../utils/queryUtils';

export type VisitQueryOptions = RequireAtLeastOne<{
  includeEmployee: boolean;
}>;

export default class VisitService {
  public async getAllVisits() {
    let visits: Visit[] | null = null;

    try {
      visits = await prisma.visit.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return visits;
  }

  public async getVisitPartById(
    id: VisitPart['id'],
    options?: VisitQueryOptions
  ) {
    if (options?.includeEmployee) {
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
    return await executeDatabaseOperation(
      prisma.visitPart.findFirst({
        where: { id }
      })
    );
  }

  public async getVisitById(id: VisitPart['id']) {
    const visit = await executeDatabaseOperation(
      prisma.visit.findFirst({
        where: { id },
        include: {
          visitParts: true
        }
      })
    );

    return visit;
  }

  // TODO FIXME: this is not working
  public async createVisit(data: VisitPartCreationData) {
    // const { employeeIds, ...otherData } = data;

    // return await executeDatabaseOperation(
    //   prisma.visit.create({
    //     data: {
    //       ...otherData,
    //       name: `${data.reservationId}`, // visit name should contain the visit number
    //       employees: {
    //         createMany: {
    //           data: employeeIds.map((id) => ({
    //             employeeId: id,
    //             status: Status.TO_BE_CONFIRMED
    //           }))
    //         }
    //       }
    //     }
    //   })
    // );
    return null;
  }

  public async changeVisitData(data: ChangeVisitData) {
    const { id, startDate } = data;

    const oldVisitData = await this.getVisitById(id);

    if (!oldVisitData) {
      return null;
    }

    const oldStartDate = oldVisitData.visitParts[0]!.startDate;

    const newOldStartDateDifference = minutesBetween(oldStartDate, startDate);

    console.log(oldStartDate, startDate, newOldStartDateDifference);
    if (!isNewStartDateValid(startDate, oldStartDate)) {
      return null;
    }
    advanceDateByMinutes;

    const visit = await executeDatabaseOperation(
      prisma.visit.update({
        where: { id },
        data: {
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
                  // ...visitPart,
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
      })
    );

    return visit ? flattenNestedVisit(visit) : null;
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

  // public async autoCloseVisit(id: Visit['id'], endDate: Visit['endDate']) {
  //   let visitToClose: VisitEmployee[] | null = null;

  //   if (now().isAfter(endDate)) {
  //     await executeDatabaseOperation(
  //       prisma.visitEmployee.updateMany({
  //         where: { visitId: id },
  //         data: { status: Status.CLOSED }
  //       })
  //     );
  //   }

  //   return visitToClose;
  // }

  public async cancelVisit(id: Visit['id']) {
    const oldVisitData = await this.getVisitById(id);

    if (!oldVisitData) {
      return null;
    }

    const canceledVisit = await executeDatabaseOperation(
      prisma.visit.update({
        where: { id },
        data: {
          includeDetergents: false,
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
      })
    );

    return canceledVisit ? flattenNestedVisit(canceledVisit) : null;
  }
}
