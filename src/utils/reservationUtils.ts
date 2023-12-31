import { Frequency, Prisma, type Reservation, Status, type Visit } from '@prisma/client';

import { ReservationCreationData } from '~/schemas/reservation';

import { advanceDateByDays, isTheSameDay } from './dateUtils';
import { getHolidayBusyHours } from './holidays';
import { getFrequencyHelpers } from './timeslotUtils';

export function createVisits(
  visitData: Pick<ReservationCreationData, 'visitParts' | 'includeDetergents'>,
  frequency: Reservation['frequency'],
  endDate: string
) {
  const { visitParts, includeDetergents } = visitData;

  const startDate = visitParts[0]?.startDate;
  const lastVisitPartEndDate = visitParts.at(-1)?.endDate;

  if (!startDate || !lastVisitPartEndDate) {
    throw new Error('Missing startDate or endDate');
  }

  const { step, advanceDateCallback, numberOfUnitsBetweenStartEndCallback } =
    getFrequencyHelpers(frequency);

  const firstVisitPartStartDate = visitParts[0]?.startDate;

  const holidayBusyHours = firstVisitPartStartDate
    ? getHolidayBusyHours([
        {
          startDate: new Date(firstVisitPartStartDate),
          endDate: new Date(endDate)
        }
      ])
    : [];

  const numberOfVisits = numberOfUnitsBetweenStartEndCallback
    ? numberOfUnitsBetweenStartEndCallback(endDate, firstVisitPartStartDate) + 1
    : 1;

  const unitSteps = [...Array<unknown>(Math.ceil(numberOfVisits / (step || 1)))].map(
    (_, i) => i * step
  );

  return Prisma.validator<Prisma.VisitCreateWithoutReservationInput[]>()(
    unitSteps.map((unit) => ({
      includeDetergents,
      visitParts: {
        create: visitParts.map((visitPart) => {
          let visitPartStartDate = advanceDateCallback
            ? new Date(advanceDateCallback(visitPart.startDate, unit))
            : new Date(visitPart.startDate);
          let visitPartEndDate = advanceDateCallback
            ? new Date(advanceDateCallback(visitPart.endDate, unit))
            : new Date(visitPart.endDate);

          // if the visit part is on a holiday, move it to the closest non-holiday day
          while (
            holidayBusyHours.some(({ startDate }) => isTheSameDay(startDate, visitPartStartDate))
          ) {
            visitPartStartDate = advanceDateByDays(visitPartStartDate, 1);
            visitPartEndDate = advanceDateByDays(visitPartEndDate, 1);
          }

          return {
            ...visitPart,
            status: Status.TO_BE_CONFIRMED,
            startDate: visitPartStartDate,
            endDate: visitPartEndDate
          };
        })
      }
    }))
  );
}

export function shouldChangeVisitFrequency(oldFrequency: Frequency, newFrequency: Frequency) {
  return oldFrequency !== newFrequency && ![oldFrequency, newFrequency].includes(Frequency.ONCE);
}

export function changeStatus(visit: Visit, newStatus: Status) {
  return {
    ...visit,
    status: newStatus
  };
}

export function changeMultipleVisitsStatus(visits: Visit[], newStatus: Status) {
  return visits.map((visit) => ({
    ...visit,
    status: newStatus
  }));
}
