import { Frequency, Prisma, type Reservation, Status, type Visit } from '@prisma/client';

import { ReservationCreationData } from '~/schemas/reservation';

import {
  advanceDateByDays,
  advanceDateByMonths,
  advanceDateByWeeks,
  isTheSameDay,
  numberOfMonthsBetween,
  numberOfWeeksBetween
} from './dateUtils';
import { getHolidayBusyHours } from './holidays';

function createWeeklyVisits(
  visitData: Pick<ReservationCreationData, 'visitParts' | 'includeDetergents'>,
  endDate: string,
  weekSpan: number
) {
  const { visitParts, includeDetergents } = visitData;

  const firstVisitPartStartDate = visitParts[0]?.startDate;

  const holidayBusyHours = firstVisitPartStartDate
    ? getHolidayBusyHours([
        {
          startDate: new Date(firstVisitPartStartDate),
          endDate: new Date(endDate)
        }
      ])
    : [];

  const numberOfWeeks = numberOfWeeksBetween(endDate, firstVisitPartStartDate) + 1;

  const weekNumbers = [...Array<unknown>(Math.ceil(numberOfWeeks / weekSpan))].map(
    (_, i) => i * weekSpan
  );

  return Prisma.validator<Prisma.VisitCreateWithoutReservationInput[]>()(
    weekNumbers.map((week) => ({
      includeDetergents,
      visitParts: {
        create: visitParts.map((visitPart) => {
          let visitPartStartDate = new Date(advanceDateByWeeks(visitPart.startDate, week));
          let visitPartEndDate = new Date(advanceDateByWeeks(visitPart.endDate, week));

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

function createMonthlyVisits(
  visitData: Pick<ReservationCreationData, 'visitParts' | 'includeDetergents'>,
  endDate: string
) {
  const { visitParts, includeDetergents } = visitData;

  const firstVisitPartStartDate = visitParts[0]?.startDate;

  const holidayBusyHours = firstVisitPartStartDate
    ? getHolidayBusyHours([
        {
          startDate: new Date(firstVisitPartStartDate),
          endDate: new Date(endDate)
        }
      ])
    : [];

  const numberOfMonths = numberOfMonthsBetween(endDate, firstVisitPartStartDate) + 1;

  const monthNumbers = [...Array<unknown>(numberOfMonths)].map((_, i) => i);

  return Prisma.validator<Prisma.VisitCreateWithoutReservationInput[]>()(
    monthNumbers.map((month) => ({
      includeDetergents,
      visitParts: {
        create: visitParts.map((visitPart) => {
          let visitPartStartDate = new Date(advanceDateByMonths(visitPart.startDate, month));
          let visitPartEndDate = new Date(advanceDateByMonths(visitPart.endDate, month));

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

  switch (frequency) {
    case Frequency.ONCE_A_WEEK:
      return createWeeklyVisits(visitData, endDate, 1);
    case Frequency.EVERY_TWO_WEEKS:
      return createWeeklyVisits(visitData, endDate, 2);
    case Frequency.ONCE_A_MONTH:
      // TODO: wonder if the monthly reservation should be created on the same day of the month
      // or on the same day of the week but every 4 or 5 weeks
      // because sometimes it could happen that the day of the month doesn't exist
      // or the day of the month is on a weekend
      // here the proper week day handling should be implemented
      return createMonthlyVisits(visitData, endDate);
    case Frequency.ONCE:
    default:
      return [
        {
          canDateBeChanged: true,
          includeDetergents,
          visitParts: {
            create: visitParts.map((visitPart, index) => ({
              ...visitPart,
              // name: `${reservationName}-${1}-${index + 1}`,
              status: Status.TO_BE_CONFIRMED
            }))
          }
        }
      ];
  }
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
