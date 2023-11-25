import {
  Employee,
  Service,
  Unit,
  type VisitPart,
  VisitService
} from '@prisma/client';
import { omit } from 'lodash';

type EmployeeNested = {
  employee: Omit<Employee, 'password'>;
};

type VisitServiceNested = VisitService & {
  service: Service & { unit: Unit | null };
};

type VisitQueryResult = {
  visitParts: Array<VisitPart & { employeeService: EmployeeNested }>;
  services: VisitServiceNested[];
};

export function flattenNestedVisits(visits: VisitQueryResult[]) {
  return visits.map((visit) => flattenNestedVisit(visit));
}

export function flattenNestedVisitServices(services: VisitServiceNested[]) {
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
    })),
    services: flattenNestedVisitServices(visit.services)
  };
}
