import type {
  ReservationService,
  Service,
  Unit,
  Visit,
  VisitPart
} from '@prisma/client';
import { omit } from 'lodash';

import type { EmployeeNested } from './employeeUtils';

type ReservationServiceNested = ReservationService & {
  service: Service & { unit: Unit | null };
};

type VisitQueryResult = Visit & {
  visitParts: Array<VisitPart & { employeeService: EmployeeNested }>;
};

export function flattenNestedVisits(visits: VisitQueryResult[]) {
  const newVisits = visits.map((visit) => flattenNestedVisit(visit));

  if (newVisits.length === 0) return newVisits;

  newVisits.sort((a, b) => visitStartDate(a) - visitStartDate(b));

  return newVisits;
}

const visitStartDate = (visit: ReturnType<typeof flattenNestedVisit>) =>
  visit.visitParts[0]!.startDate.getTime();

export function flattenNestedReservationServices(
  services: ReservationServiceNested[]
) {
  return services.map((service) => ({
    ...omit(service, 'serviceId', 'service'),
    ...service.service
  }));
}

export function flattenNestedVisit(visit: VisitQueryResult) {
  return {
    ...visit,
    visitParts: visit.visitParts.map((visitPart) => ({
      ...omit(visitPart, 'employeeService', 'employeeServiceId'),
      ...visitPart.employeeService
    }))
  };
}
