import {
  Frequency,
  type Reservation,
  Status,
  type Visit
} from '@prisma/client';

import { ReservationCreationData } from '~/schemas/reservation';

import { advanceDateByDays, isTheSameDay } from './dateUtils';
import { getHolidayBusyHours } from './holidays';
import { getFrequencyHelpers, timeslotsIntersection } from './timeslotUtils';
import { flattenNestedVisits } from './visits';

export function createVisits(
  visitData: Pick<
    ReservationCreationData,
    'visitParts' | 'detergentsCost' | 'frequency'
  >,
  frequency: Reservation['frequency'],
  endDate: string
) {
  const { visitParts, detergentsCost } = visitData;

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

  const unitSteps = [
    ...Array<unknown>(Math.ceil(numberOfVisits / (step || 1)))
  ].map((_, i) => i * step);

  return unitSteps.map((unit) => ({
    detergentsCost,
    visitParts: visitParts.map((visitPart) => {
      let visitPartStartDate = advanceDateCallback
        ? new Date(advanceDateCallback(visitPart.startDate, unit))
        : new Date(visitPart.startDate);
      let visitPartEndDate = advanceDateCallback
        ? new Date(advanceDateCallback(visitPart.endDate, unit))
        : new Date(visitPart.endDate);

      // if the visit part is on a holiday, move it to the closest non-holiday day
      while (
        holidayBusyHours.some(({ startDate }) =>
          isTheSameDay(startDate, visitPartStartDate)
        )
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
  }));
}

export function shouldChangeVisitFrequency(
  oldFrequency: Frequency,
  newFrequency: Frequency
) {
  return (
    oldFrequency !== newFrequency &&
    ![oldFrequency, newFrequency].includes(Frequency.ONCE)
  );
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

export const checkReservationConflict = (
  createdVisits: ReturnType<typeof createVisits>,
  allPendingVisits: ReturnType<typeof flattenNestedVisits>,
  visitPartEmployees: number[]
) => {
  const allPendingVisitParts = allPendingVisits
    .flatMap((visit) => visit.visitParts)
    .filter((visitPart) => visitPartEmployees.includes(visitPart.employeeId));

  allPendingVisitParts.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return visitPartEmployees.flatMap((employeeId) =>
    timeslotsIntersection([
      allPendingVisitParts.filter(
        (visitPart) => visitPart.employeeId === employeeId
      ),
      [...createdVisits]
        .map(({ visitParts }) =>
          visitParts
            .filter((visitPart) => visitPart.employeeId === employeeId)
            .map(({ startDate, endDate }) => ({
              startDate: new Date(startDate),
              endDate: new Date(endDate)
            }))
        )
        .flat()
    ])
  );
};
