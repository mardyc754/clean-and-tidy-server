import { Reservation, VisitPart } from '@prisma/client';
import { Job, scheduleJob } from 'node-schedule';

export class Scheduler {
  private static instance: Scheduler;
  private visitPartJobs: Record<VisitPart['id'], Job> = {};
  private reservationJobs: Record<Reservation['id'], Job> = {};

  private constructor() {}

  public static getInstance(): Scheduler {
    if (!this.instance) {
      this.instance = new Scheduler();
    }
    return this.instance;
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

  public scheduleReservationJob(
    reservation: Reservation,
    endDate: Date,
    callback: () => void
  ) {
    const job = scheduleJob(endDate, callback);
    this.reservationJobs[reservation.id] = job;
  }

  public cancelReservationJob(reservationId: Reservation['id']) {
    const job = this.reservationJobs[reservationId];
    if (job) {
      job.cancel();
      delete this.reservationJobs[reservationId];
    }
  }
}
