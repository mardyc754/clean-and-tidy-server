import { Job, scheduleJob } from 'node-schedule';

export class Scheduler {
  private static instance: Scheduler | undefined;
  private jobs: Record<string, Job> = {};

  private constructor() {}

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public scheduleJob(jobId: string, endDate: Date, callback: () => void) {
    const job = scheduleJob(endDate, callback);
    this.jobs[jobId] = job;
  }

  public cancelJob(jobId: string) {
    const job = this.jobs[jobId];
    if (job) {
      job.cancel();
      delete this.jobs[jobId];
    }
  }

  public rescheduleJob(jobId: string, endDate: Date, callback: () => void) {
    this.cancelJob(jobId);
    this.scheduleJob(jobId, endDate, callback);
  }
}
