import { Prisma, Service, Status } from '@prisma/client';

import prisma from '~/lib/prisma';
import { prismaExclude } from '~/lib/prismaExclude';

import { AllServicesQueryOptions } from '~/services/TypesOfCleaningService';

import { Timeslot } from '~/utils/timeslotUtils';

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
      employees: options?.includeEmployees ? serviceEmployees : undefined
    }
  });
};

export const getSingleServiceData = (id: Service['id']) => {
  return Prisma.validator<Prisma.ServiceFindUniqueArgs>()({
    where: { id },
    include: {
      ...serviceUnit,
      primaryServices: serviceWithUnit,
      secondaryServices: serviceWithUnit,
      cleaningFrequencies: { select: { name: true, value: true } }
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
        reservation: {
          include: {
            address: true
          }
        }
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

export const reservationWithGivenStatuses = (statuses: Status[]) => {
  return Prisma.validator<Prisma.ReservationWhereInput>()({
    visits: {
      some: visitWithVisitPartsWithGivenStatuses(statuses)
    }
  });
};

export const visitWithVisitPartsWithGivenStatuses = (statuses: Status[]) => {
  return Prisma.validator<Prisma.VisitWhereInput>()({
    visitParts: { some: visitPartstWithGivenStatuses(statuses) }
  });
};

export const visitPartstWithGivenStatuses = (statuses: Status[]) => {
  return Prisma.validator<Prisma.VisitPartWhereInput>()({
    status: { in: statuses }
  });
};

export const includeFullReservationDetails =
  Prisma.validator<Prisma.ReservationDefaultArgs>()({
    include: {
      visits: includeAllVisitData,
      address: true,
      services: serviceInclude
    }
  });
