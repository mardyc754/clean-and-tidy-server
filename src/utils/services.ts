import {
  type ServiceUnit,
  type Service,
  type CleaningFrequency
} from '@prisma/client';

type ServiceWithUnit = Service & {
  unit: ServiceUnit | null;
  secondaryServices?: ServiceWithUnit[];
  primaryServices?: ServiceWithUnit[];
  cleaningFrequencies?: Omit<CleaningFrequency, 'id'>[];
};

function getSimplifiedServiceData(data: ServiceWithUnit) {
  const { id, name, unit } = data;

  return {
    id,
    name,
    unit: unit
      ? { name: unit.name, price: unit.price, duration: unit.duration }
      : null
  };
}

export function getResponseServiceData(data: ServiceWithUnit) {
  const { isPrimary, secondaryServices, primaryServices, cleaningFrequencies } =
    data;
  return {
    ...getSimplifiedServiceData(data),
    cleaningFrequencies,
    isPrimary,
    secondaryServices: secondaryServices?.map((service) =>
      getSimplifiedServiceData(service)
    ),
    primaryServices: primaryServices?.map((service) =>
      getSimplifiedServiceData(service)
    )
  };
}
