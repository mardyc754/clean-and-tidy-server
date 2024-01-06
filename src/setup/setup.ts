import { createFirstEmployee } from './createFirstEmployee';
import { scheduleAndCloseVisitParts } from './scheduleAndCloseVisitParts';

export function setupDB() {
  createFirstEmployee();
  scheduleAndCloseVisitParts();
}
