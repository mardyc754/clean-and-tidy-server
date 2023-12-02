import type {
  ReservationService,
  Service,
  Unit,
  VisitPart
} from '@prisma/client';
import { omit } from 'lodash';

import type { EmployeeNested } from './employeeUtils';

type ReservationServiceNested = ReservationService & {
  service: Service & { unit: Unit | null };
};

type VisitQueryResult = {
  visitParts: Array<VisitPart & { employeeService: EmployeeNested }>;
};

export function flattenNestedVisits(visits: VisitQueryResult[]) {
  return visits.map((visit) => flattenNestedVisit(visit));
}

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
