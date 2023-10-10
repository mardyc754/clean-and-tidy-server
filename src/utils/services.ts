import { type ServiceUnit, type Service } from '@prisma/client';

type ServiceWithUnit = Service & { unit: ServiceUnit | null };

export function getResponseServiceData(data: ServiceWithUnit) {
  const { id, name, unit, isPrimary } = data;
  return {
    id,
    name,
    isPrimary,
    unit: unit
      ? { name: unit.name, price: unit.price, duration: unit.duration }
      : null
  };
}
