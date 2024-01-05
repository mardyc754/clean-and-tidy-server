import { Reservation, Status, VisitPart } from '@prisma/client';
import { Job, scheduleJob } from 'node-schedule';

import { serviceInclude, visitPartWithEmployee } from '~/queries/serviceQuery';

import { isAfter, isAfterOrSame } from '~/utils/dateUtils';
import {
  flattenNestedReservationServices,
  flattenNestedVisits
} from '~/utils/visits';

import prisma from './prisma';

export class Scheduler {
  private static instance: Scheduler | undefined;
  private visitPartJobs: Record<VisitPart['id'], Job> = {};
  private reservationJobs: Record<Reservation['id'], Job> = {};

  private constructor() {}

  public static async init() {
    this.instance = new Scheduler();
    this.instance.scheduleAndCloseVisitParts();
  }

  public static getInstance() {
    return this.instance;
  }

  private async scheduleAndCloseVisitParts() {
    const scheduler = Scheduler.getInstance();

    if (!scheduler) {
      return;
    }

    return await prisma.$transaction(async (tx) => {
      const allActiveReservations = await tx.reservation.findMany({
        where: { status: Status.ACTIVE },
        include: {
          visits: {
            include: {
              visitParts: visitPartWithEmployee
            }
          },
          services: serviceInclude
        }
      });

      const allActiveReservationsData = allActiveReservations.map(
        (reservation) => ({
          ...reservation,
          visits: flattenNestedVisits(reservation.visits),
          services: flattenNestedReservationServices(reservation.services)
        })
      );

      const reservationVisitParts = await prisma.visitPart.findMany({
        where: {
          visit: {
            reservationId: { in: allActiveReservations.map(({ id }) => id) }
          },
          status: Status.ACTIVE
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
        },
        orderBy: { startDate: 'asc' }
      });

      if (!reservationVisitParts || reservationVisitParts.length === 0) {
        return;
      }

      const pastVisitParts = reservationVisitParts.filter((visitPart) =>
        isAfterOrSame(new Date(), visitPart.endDate)
      );

      if (pastVisitParts.length > 0) {
        await prisma.visitPart.updateMany({
          where: { id: { in: pastVisitParts.map(({ id }) => id) } },
          data: {
            status: Status.CLOSED
          }
        });
      }

      const futureVisitParts = reservationVisitParts.filter((visitPart) =>
        isAfter(visitPart.endDate, new Date())
      );

      futureVisitParts.forEach(async (visitPart) => {
        scheduler.scheduleVisitPartJob(visitPart, () =>
          prisma.visitPart.updateMany({
            where: { id: { in: pastVisitParts.map(({ id }) => id) } },
            data: {
              status: Status.CLOSED
            }
          })
        );
      });

      // close past reservations if there are any
      const pastReservations = allActiveReservationsData.filter(
        (reservation) => {
          const reservationEndDate = Math.max(
            ...reservation.visits
              .flatMap((visit) => visit.visitParts)
              .map((visitPart) => new Date(visitPart.endDate).getTime())
          );

          return isAfterOrSame(new Date(), new Date(reservationEndDate));
        }
      );

      if (pastReservations.length > 0) {
        await tx.reservation.updateMany({
          where: { id: { in: pastReservations.map(({ id }) => id) } },
          data: {
            status: Status.CLOSED
          }
        });
      }

      const futureReservations = allActiveReservationsData.filter(
        (reservation) => {
          const reservationEndDate = Math.max(
            ...reservation.visits
              .flatMap((visit) => visit.visitParts)
              .map((visitPart) => new Date(visitPart.endDate).getTime())
          );

          return isAfter(new Date(reservationEndDate), new Date());
        }
      );

      futureReservations?.forEach(async (reservation) => {
        const reservationEndDate =
          reservationVisitParts[reservationVisitParts.length - 1]!.endDate;

        scheduler.scheduleReservationJob(
          reservation.id,
          new Date(reservationEndDate),
          () =>
            tx.reservation.update({
              where: { id: reservation.id },
              data: {
                status: Status.CLOSED
              }
            })
        );
      });
    });
  }

  public cancelReservationsAndVisitParts(
    reservationIds: Array<Reservation['id']>,
    visitPartIds: Array<VisitPart['id']>
  ) {
    reservationIds.forEach((reservationId) => {
      this.cancelReservationJob(reservationId);
    });

    visitPartIds.forEach((visitPart) => {
      this.cancelVisitPartJob(visitPart);
    });
  }

  public async scheduleVisitPartJobsCloseForReservation(
    reservationId: Reservation['id']
  ) {
    return await prisma.$transaction(async (tx) => {
      const reservationVisitParts = await tx.visitPart.findMany({
        where: { visit: { reservationId: reservationId } }
      });

      reservationVisitParts.forEach((visitPart) => {
        this.scheduleVisitPartJob(visitPart, () =>
          tx.visitPart.updateMany({
            where: { id: { in: reservationVisitParts.map(({ id }) => id) } },
            data: {
              status: Status.CLOSED
            }
          })
        );
      });

      Scheduler.instance?.scheduleReservationJob(
        reservationId,
        new Date(
          reservationVisitParts[reservationVisitParts.length - 1]!.endDate
        ),
        () =>
          tx.reservation.update({
            where: { id: reservationId },
            data: {
              status: Status.CLOSED
            }
          })
      );
    });
  }

  public async changeVisitPartsCloseSchedule(visitParts: VisitPart[]) {
    visitParts.forEach((visitPart) => {
      this.cancelVisitPartJob(visitPart.id);
      this.scheduleVisitPartJob(visitPart, () => {
        prisma.visitPart.update({
          where: { id: visitPart.id },
          data: { status: Status.CLOSED }
        });
      });
    });
  }

  public scheduleReservationJob(
    reservationId: Reservation['id'],
    endDate: Date,
    callback: () => void
  ) {
    const job = scheduleJob(endDate, callback);
    this.reservationJobs[reservationId] = job;
  }

  public cancelReservationJob(reservationId: Reservation['id']) {
    const job = this.reservationJobs[reservationId];
    if (job) {
      job.cancel();
      delete this.reservationJobs[reservationId];
    }
  }

  public scheduleVisitPartJob(visitPart: VisitPart, callback: () => void) {
    const job = scheduleJob(new Date(visitPart.endDate), callback);
    this.visitPartJobs[visitPart.id] = job;
  }

  public cancelVisitPartJob(visitPartId: VisitPart['id']) {
    const job = this.visitPartJobs[visitPartId];
    if (job) {
      job.cancel();
      delete this.visitPartJobs[visitPartId];
    }
  }
}
