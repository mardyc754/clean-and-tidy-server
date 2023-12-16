import { Prisma, Service } from '@prisma/client';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import {
  type EmployeeCreationData,
  EmployeeWorkingHoursOptions,
  ServicesWorkingHoursOptions
} from '~/schemas/employee';

import {
  AllServicesQueryOptions,
  ServiceQueryOptions
} from '~/services/TypesOfCleaningService';

import { Timeslot } from '~/utils/employeeUtils';
import { getCyclicDateRanges } from '~/utils/reservationUtils';

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

export const visitPartWithEmployee = Prisma.validator<
  Prisma.VisitPartAggregateArgs & Prisma.VisitPartDefaultArgs
>()({
  include: {
    employeeService: {
      select: {
        employee: selectEmployee
      }
    }
  },
  orderBy: {
    startDate: 'asc'
  }
});

export const serviceInclude =
  Prisma.validator<Prisma.ReservationServiceDefaultArgs>()({
    include: {
      service: serviceWithUnit
    }
  });

export const includeAllVisitData = Prisma.validator<Prisma.VisitDefaultArgs>()({
  include: {
    visitParts: visitPartWithEmployee
    // include services only if the option is true
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

export const includeVisitParts = Prisma.validator<
  Prisma.VisitPartAggregateArgs & Prisma.VisitPartDefaultArgs
>()({
  include: {
    employeeService: includeFullService,
    visit: {
      include: {
        reservation: true
      }
    }
  },
  orderBy: {
    startDate: 'asc'
  }
});

export const includeServiceVisitPartsAndReservation =
  Prisma.validator<Prisma.EmployeeServiceDefaultArgs>()({
    include: {
      service: serviceWithUnit,
      visitParts: includeVisitParts
    }
  });

export const visitPartTimeframe = (
  cyclicRanges: Timeslot[] | null,
  excludeFrom?: string,
  excludeTo?: string
) => {
  return Prisma.validator<
    Prisma.VisitPartAggregateArgs & Prisma.VisitPartDefaultArgs
  >()({
    where: {
      OR: cyclicRanges?.map(({ startDate, endDate }) => ({
        startDate: {
          gte: startDate
        },
        endDate: {
          lte: endDate
        }
      })),
      NOT: {
        startDate: {
          gte: excludeFrom
        },
        endDate: {
          lte: excludeTo
        }
      }
    },
    orderBy: {
      startDate: 'asc'
    }
  });
};
