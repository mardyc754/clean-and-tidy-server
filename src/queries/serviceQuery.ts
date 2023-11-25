import { Prisma, Service } from '@prisma/client';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import {
  AllServicesQueryOptions,
  ServiceQueryOptions
} from '~/services/TypesOfCleaningService';

export const serviceUnit = Prisma.validator<Prisma.ServiceInclude>()({
  unit: true
});

export const serviceWithUnit = Prisma.validator<Prisma.ServiceDefaultArgs>()({
  include: serviceUnit
});

export const selectEmployee = Prisma.validator<Prisma.EmployeeDefaultArgs>()({
  select: prismaExclude('Employee', ['password'])
});

export const employeeData = Prisma.validator<Prisma.EmployeeSelect>()(
  prismaExclude('Employee', ['password'])
);

export const serviceEmployees = Prisma.validator<
  Pick<Prisma.EmployeeServiceDefaultArgs, 'select'>
>()({
  select: {
    employee: {
      select: prismaExclude('Employee', ['password'])
    }
  }
});

export const getServiceEmployees = (include: boolean) => {
  if (!include) {
    return undefined;
  }

  return Prisma.validator(
    prisma,
    'service',
    'findMany',
    'select'
  )({
    employees: {
      select: {
        employee: {
          select: prismaExclude('Employee', ['password'])
        }
      }
    }
  });
};

export const getAllServicesData = (options?: AllServicesQueryOptions) => {
  return Prisma.validator<Prisma.ServiceFindManyArgs>()({
    where: options?.primaryOnly ? { isPrimary: true } : undefined,
    include: {
      ...serviceUnit,
      // employees: options?.includeEmployees
      //   ? getServiceEmployees(!!options?.includeEmployees)
      //   : undefined
      employees: options?.includeEmployees ? serviceEmployees : undefined
    }
  });
};

export const getSingleServiceData = (
  id: Service['id'],
  options?: ServiceQueryOptions
) => {
  return Prisma.validator<Prisma.ServiceFindUniqueArgs>()({
    where: { id },
    include: {
      ...serviceUnit,
      primaryServices: serviceWithUnit,
      secondaryServices: serviceWithUnit,
      cleaningFrequencies: options?.includeCleaningFrequencies
        ? { select: { name: true, value: true } }
        : undefined
    }
  });
};

export const visitPartWithEmployee =
  Prisma.validator<Prisma.VisitPartDefaultArgs>()({
    include: {
      employeeService: {
        select: {
          employee: selectEmployee
        }
      }
    }
  });

export const serviceInclude =
  Prisma.validator<Prisma.VisitServiceDefaultArgs>()({
    include: {
      service: serviceWithUnit
    }
  });

export const includeAllVisitData = Prisma.validator<Prisma.VisitDefaultArgs>()({
  include: {
    visitParts: visitPartWithEmployee,
    // include services only if the option is true
    services: serviceInclude
  }
});

export const includeFullService =
  Prisma.validator<Prisma.EmployeeServiceDefaultArgs>()({
    include: {
      service: {
        include: {
          unit: true
        }
      }
    }
  });
