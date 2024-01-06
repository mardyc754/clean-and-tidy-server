import { Scheduler } from '../utils/Scheduler';
import { createFirstEmployee } from './createFirstEmployee';
import { scheduleAndCloseVisitParts } from './scheduleAndCloseVisitParts';

export function setupDB() {
  Scheduler.init();
  createFirstEmployee();
  scheduleAndCloseVisitParts();
}
