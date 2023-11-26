import { EmployeeService, Status, type Visit, VisitPart } from '@prisma/client';
import { omit } from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

import { ChangeVisitDateData, VisitPartCreationData } from '~/schemas/visit';

import { areStartEndDateValid, now } from '~/utils/dateUtils';

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

  public async getVisitById(id: VisitPart['id'], options?: VisitQueryOptions) {
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

  // TODO FIXME: this is not working
  public async changeVisitDate(data: ChangeVisitDateData) {
    const { id, startDate, endDate } = data;

    const oldVisitData = await this.getVisitById(id);

    if (!oldVisitData) {
      return null;
    }

    // const { startDate: oldStartDate, endDate: oldEndDate } = oldVisitData;

    let updatedVisit: Visit | null = null;

    // if (areStartEndDateValid(startDate, endDate, oldStartDate, oldEndDate)) {
    //   try {
    //     updatedVisit = await prisma.visit.update({
    //       where: { id },
    //       data: {
    //         startDate,
    //         endDate,
    //         employees: {
    //           updateMany: {
    //             where: { visitId: id },
    //             data: { status: Status.TO_BE_CONFIRMED }
    //           }
    //         }
    //       }
    //     });
    //   } catch (err) {
    //     console.error(`Something went wrong: ${err}`);
    //   }
    // }

    return updatedVisit;
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

  // TODO FIXME: this is not working
  public async changeVisitStatus(
    visitId: Visit['id'],
    employeeId: EmployeeService['employeeId'],
    newStatus: VisitPart['status']
  ) {
    // const visitStatus = await executeDatabaseOperation(
    //   prisma.visitEmployee.update({
    //     where: { visitId_employeeId: { visitId, employeeId } },
    //     data: { status: newStatus }
    //   })
    // );
    // if (!visitStatus) {
    //   return null;
    // }
    // const visit = await this.getVisitById(visitId);
    // return visit;
    return null;
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
}
