import {
  type CleaningFrequency,
  type Employee,
  type EmployeeService,
  Prisma,
  type Service,
  type Unit
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
