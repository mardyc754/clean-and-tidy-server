import { type ServiceUnit, type Service } from '@prisma/client';

type ServiceWithUnit = Service & {
  unit: ServiceUnit | null;
  // secondaryServices?: SetOptional<ServiceWithUnit, 'unit'>[];
  // primaryServices?: SetOptional<ServiceWithUnit, 'unit'>[];
  secondaryServices?: ServiceWithUnit[];
  primaryServices?: ServiceWithUnit[];
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
  const { isPrimary, secondaryServices, primaryServices } = data;
  return {
    ...getSimplifiedServiceData(data),
    isPrimary,
    secondaryServices: secondaryServices?.map((service) =>
      getSimplifiedServiceData(service)
    ),
    primaryServices: primaryServices?.map((service) =>
      getSimplifiedServiceData(service)
    )
  };
}
