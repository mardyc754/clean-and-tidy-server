import { Status, VisitEmployee, type Visit } from '@prisma/client';
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

  public async getVisitById(id: Visit['id'], options?: VisitQueryOptions) {
    let visit: Visit | null = null;

    try {
      visit = await prisma.visit.findFirst({
        where: { id },
        include: options?.includeEmployees
          ? { employees: { include: { employee: true } } }
          : undefined
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return visit;
  }

  public async createVisit(data: SingleVisitCreationData) {
    const { employeeIds, ...otherData } = data;

    return await executeDatabaseOperation(
      prisma.visit.create({
        data: {
          ...otherData,
          name: `${data.reservationId}`, // visit name should contain the visit number
          employees: {
            createMany: {
              data: employeeIds.map((id) => ({
                employeeId: id,
                status: Status.TO_BE_CONFIRMED
              }))
            }
          }
        }
      })
    );
  }

  public async changeVisitDate(data: ChangeVisitDateData) {
    const { id, startDate, endDate } = data;

    const oldVisitData = await this.getVisitById(id);

    if (!oldVisitData) {
      return null;
    }

    const { startDate: oldStartDate, endDate: oldEndDate } = oldVisitData;

    let updatedVisit: Visit | null = null;

    if (areStartEndDateValid(startDate, endDate, oldStartDate, oldEndDate)) {
      try {
        updatedVisit = await prisma.visit.update({
          where: { id },
          data: {
            startDate,
            endDate,
            employees: {
              updateMany: {
                where: { visitId: id },
                data: { status: Status.TO_BE_CONFIRMED }
              }
            }
          }
        });
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
      }
    }

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

  public async changeVisitStatus(
    visitId: Visit['id'],
    employeeId: VisitEmployee['employeeId'],
    newStatus: VisitEmployee['status']
  ) {
    const visitStatus = await executeDatabaseOperation(
      prisma.visitEmployee.update({
        where: { visitId_employeeId: { visitId, employeeId } },
        data: { status: newStatus }
      })
    );

    if (!visitStatus) {
      return null;
    }

    const visit = await this.getVisitById(visitId);

    return visit;
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
