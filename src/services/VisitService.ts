import { EmployeeService, Status, type Visit, VisitPart } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

import { ChangeVisitDateData, SingleVisitCreationData } from '~/schemas/visit';

import { areStartEndDateValid, now } from '~/utils/dateUtils';

import { executeDatabaseOperation } from '../utils/queryUtils';

export type VisitQueryOptions = RequireAtLeastOne<{
  includeEmployees: boolean;
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

  // TODO FIXME: this is not working
  public async getVisitById(id: Visit['id'], options?: VisitQueryOptions) {
    let visit: Visit | null = null;

    // try {
    //   visit = await prisma.visit.findFirst({
    //     where: { id },
    //     include: options?.includeEmployees
    //       ? { employees: { include: { employee: true } } }
    //       : undefined
    //   });
    // } catch (err) {
    //   console.error(`Something went wrong: ${err}`);
    // }

    return visit;
  }

  // TODO FIXME: this is not working
  public async createVisit(data: SingleVisitCreationData) {
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
