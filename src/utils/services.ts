import {
  type CleaningFrequency,
  type Employee,
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
