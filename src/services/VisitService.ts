import { Status, type Visit } from '@prisma/client';

import { prisma } from '~/db';
import { ChangeVisitDateData, SingleVisitCreationData } from '~/schemas/visit';
import { areStartEndDateValid, now } from '~/utils/dateUtils';
import { executeDatabaseOperation } from './utils';

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

  public async getVisitById(id: Visit['id']) {
    let visit: Visit | null = null;

    try {
      visit = await prisma.visit.findFirst({
        where: { id }
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
          status: Status.TO_BE_CONFIRMED,
          employees: {
            connect: employeeIds.map((id) => ({ id }))
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
            status: Status.TO_BE_CONFIRMED
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

  public async changeVisitStatus(id: Visit['id'], newStatus: Visit['status']) {
    let updatedVisit: Visit | null = null;

    try {
      updatedVisit = await prisma.visit.update({
        where: { id },
        data: { status: newStatus }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return updatedVisit;
  }

  public async autoCloseVisit(data: Pick<Visit, 'id' | 'endDate'>) {
    let visitToClose: Visit | null = null;

    const { id, endDate } = data;

    if (now().isAfter(endDate)) {
      visitToClose = await this.changeVisitStatus(id, Status.CLOSED);
    }

    return visitToClose;
  }
}
