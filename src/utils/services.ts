import {
  type CleaningFrequency,
  type Employee,
  type EmployeeService,
  Reservation,
  type Service,
  type Unit,
  Visit,
  VisitPart
} from '@prisma/client';
import { omit } from 'lodash';

type ServiceWithUnit = Service & {
  unit: Unit | null;
  secondaryServices?: ServiceWithUnit[];
  primaryServices?: ServiceWithUnit[];
  employees?: Array<{ employee: Omit<Employee, 'password'> }>;
  cleaningFrequencies?: Omit<CleaningFrequency, 'id'>[];
};

type EmployeeServiceNested = EmployeeService & {
  service: Service & { unit: Unit | null };
  visitParts: Array<
    VisitPart & {
      employeeService: EmployeeService & { service: ServiceWithUnit };
      visit: Visit & { reservation: Reservation };
    }
  >;
};

// type ServiceWithUnit = Prisma.ServiceGetPayload<typeof serviceWithUnit>;

function getSimplifiedServiceData(data: ServiceWithUnit) {
  const { id, name, unit } = data;

  return {
    id,
    name,
    unit: unit ? omit(unit, ['id']) : null
  };
}

export function getResponseServiceData(data: ServiceWithUnit) {
  const { isPrimary, secondaryServices, primaryServices, employees, ...rest } =
    data;
  return {
    ...getSimplifiedServiceData(data),
    ...rest,
    isPrimary,
    secondaryServices: secondaryServices?.map((service) =>
      getSimplifiedServiceData(service)
    ),
    primaryServices: primaryServices?.map((service) =>
      getSimplifiedServiceData(service)
    ),
    employees: employees?.flatMap(({ employee }) => employee)
  };
}

export function flattenNestedEmployeeServices(
  services: EmployeeServiceNested[]
) {
  return services.map((service) => ({
    ...omit(service, 'serviceId', 'service'),
    ...service.service
  }));
}

export function flattenVisitPartsFromServices(
  services: EmployeeServiceNested[]
) {
  return flattenNestedEmployeeServices(services).flatMap(
    (service) =>
      service.visitParts.map((visitPart) => ({
        ...omit(visitPart, 'employeeService', 'employeeServiceId', 'visit'),
        ...visitPart.employeeService,
        reservation: visitPart.visit.reservation
      }))
    // service.visitParts
  );
}
