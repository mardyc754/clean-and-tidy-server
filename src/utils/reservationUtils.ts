import {
  Frequency,
  Prisma,
  type Reservation,
  Status,
  type Visit,
  type VisitPart
} from '@prisma/client';

import { ServicesWorkingHoursOptions } from '~/schemas/employee';
import { ReservationCreationData } from '~/schemas/reservation';

import {
  advanceDateByMonths,
  advanceDateByOneYear,
  advanceDateByWeeks,
  numberOfMonthsBetween,
  numberOfWeeksBetween
} from './dateUtils';
import { TimeInterval } from './employeeUtils';

function createWeeklyVisits(
  reservationName: string,
  visitData: Pick<ReservationCreationData, 'visitParts' | 'includeDetergents'>,
  endDate: string,
  weekSpan: number
) {
  const { visitParts, includeDetergents } = visitData;

  const firstVisitPartStartDate = visitParts[0]?.startDate;

  const numberOfWeeks =
    numberOfWeeksBetween(endDate, firstVisitPartStartDate) + 1;

  const weekNumbers = [
    ...Array<unknown>(Math.ceil(numberOfWeeks / weekSpan))
  ].map((_, i) => i * weekSpan);

  return Prisma.validator<Prisma.VisitCreateWithoutReservationInput[]>()(
    weekNumbers.map((week, i) => ({
      name: `${reservationName}-${i + 1}`,
      includeDetergents,
      visitParts: {
        create: visitParts.map((visitPart, index) => ({
          ...visitPart,
          // name: `${reservationName}-${i + 1}-${index + 1}`,
          status: Status.TO_BE_CONFIRMED,
          startDate: advanceDateByWeeks(visitPart.startDate, week),
          endDate: advanceDateByWeeks(visitPart.endDate, week)
        }))
      }
    }))
  );
}

function createMonthlyVisits(
  reservationName: string,
  visitData: Pick<ReservationCreationData, 'visitParts' | 'includeDetergents'>,
  endDate: string
) {
  const { visitParts, includeDetergents } = visitData;

  const firstVisitPartStartDate = visitParts[0]?.startDate;

  const numberOfMonths =
    numberOfMonthsBetween(endDate, firstVisitPartStartDate) + 1;

  const monthNumbers = [...Array<unknown>(numberOfMonths)].map((_, i) => i);

  // return monthNumbers.map((week, i) => ({
  //   cost,
  //   includeDetergents,
  //   startDate: advanceDateByMonths(firstVisitStartDate, week),
  //   endDate: advanceDateByMonths(firstVisitEndDate, week),
  //   status: Status.TO_BE_CONFIRMED,
  //   name: `${reservationName}-${i + 1}`
  // })

  return Prisma.validator<Prisma.VisitCreateWithoutReservationInput[]>()(
    monthNumbers.map((month, i) => ({
      name: `${reservationName}-${i + 1}`,
      includeDetergents,
      visitParts: {
        create: visitParts.map((visitPart, index) => ({
          ...visitPart,
          // name: `${reservationName}-${i + 1}-${index + 1}`,
          status: Status.TO_BE_CONFIRMED,
          startDate: advanceDateByMonths(visitPart.startDate, month),
          endDate: advanceDateByMonths(visitPart.endDate, month)
        }))
      }
    }))
  );
}

export function createVisits(
  reservationName: string,
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
      return createWeeklyVisits(reservationName, visitData, endDate, 1);
    case Frequency.EVERY_TWO_WEEKS:
      return createWeeklyVisits(reservationName, visitData, endDate, 2);
    case Frequency.ONCE_A_MONTH:
      // TODO: wonder if the monthly reservation should be created on the same day of the month
      // or on the same day of the week but every 4 or 5 weeks
      // because sometimes it could happen that the day of the month doesn't exist
      // or the day of the month is on a weekend
      // here the proper week day handling should be implemented
      return createMonthlyVisits(reservationName, visitData, endDate);
    case Frequency.ONCE:
    default:
      return [
        {
          name: `${reservationName}-1`,
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

export function shouldChangeVisitFrequency(
  oldFrequency: Frequency,
  newFrequency: Frequency
) {
  return (
    oldFrequency !== newFrequency &&
    ![oldFrequency, newFrequency].includes(Frequency.ONCE)
  );
}

// TODO FIXME: this is not working
export function changeVisitFrequency(
  visits: Visit[],
  newFrequency:
    | typeof Frequency.ONCE_A_WEEK
    | typeof Frequency.EVERY_TWO_WEEKS
    | typeof Frequency.ONCE_A_MONTH,
  reservationName: Visit['name']
) {
  // for safety, it'd be better to change the date to UTC

  // const visitsBefore2Weeks = visits.filter(
  //   (visit) => dayjs(visit.startDate).diff(now()) <= 2
  // );

  // const newVisit = visitsBefore2Weeks.map((visit) => ({
  //   ...visit,
  //   status: Status.TO_BE_CONFIRMED
  // }));

  // const visitsAfter2Weeks = visits.filter(
  //   (visit) => dayjs(visit.startDate).diff(now()) > 2
  // );

  // visitsAfter2Weeks.forEach((visit, i) => {
  //   if (newFrequency === Frequency.EVERY_TWO_WEEKS) {
  //     if (i % 2) {
  //       newVisit.push({
  //         ...visit,
  //         status: Status.TO_BE_CONFIRMED,
  //         name: `${reservationName}-${newVisit.length + 1}`
  //       });
  //     }
  //   } else if (newFrequency === Frequency.ONCE_A_WEEK) {
  //     const { startDate, endDate } = visit;

  //     // current visit
  //     newVisit.push({
  //       ...visit,
  //       status: Status.TO_BE_CONFIRMED,
  //       name: `${reservationName}-${newVisit.length + 1}`
  //     });

  //     // upcoming visit
  //     newVisit.push({
  //       ...visit,
  //       status: Status.TO_BE_CONFIRMED,
  //       startDate: dayjs(startDate).add(1, 'w').toDate(),
  //       endDate: dayjs(endDate).add(1, 'w').toDate(),
  //       name: `${reservationName}-${newVisit.length + 1}`
  //     });
  //   }
  // });

  // return newVisit;
  return null;
}

export function cancelVisits(
  visits: Visit[],
  frequency: Reservation['frequency']
) {
  let newVisits: Visit[] = [];

  // if (frequency === Frequency.ONCE) {
  //   newVisits = visits.map((visit) => ({
  //     ...visit,
  //     status: Status.TO_BE_CANCELLED
  //   }));
  // } else {
  //   newVisits = visits.map((visit) =>
  //     dayjs(visit.startDate).diff(now()) > 2
  //       ? { ...visit, status: Status.TO_BE_CANCELLED }
  //       : { ...visit }
  //   );
  // }

  return newVisits;
}

// TODO: Maybe split these functions into two?
// TODO FIXME: this is not working
// Like one function for changing the weekday of the one reservation
// and another one for recurring reservations?
export function changeWeekDay(
  visits: Visit[],
  weekDay: Reservation['weekDay'],
  frequency: Reservation['frequency']
) {
  let newVisits: Visit[] = [];

  // if (frequency === Frequency.ONCE) {
  //   newVisits = visits.map((reservation) => ({
  //     ...reservation,
  //     startDate: dayjs(reservation.startDate).day(weekDay).toDate(),
  //     endDate: dayjs(reservation.endDate).day(weekDay).toDate(),
  //     status: Status.TO_BE_CONFIRMED
  //   }));
  // } else {
  //   newVisits = visits.map((reservation) =>
  //     dayjs(reservation.startDate).diff(now()) > 2
  //       ? {
  //           ...reservation,
  //           startDate: dayjs(reservation.startDate).day(weekDay).toDate(),
  //           endDate: dayjs(reservation.endDate).day(weekDay).toDate(),
  //           status: Status.TO_BE_CONFIRMED
  //         }
  //       : { ...reservation }
  //   );
  // }

  return newVisits;
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

export const getFrequencyHelpers = (frequency: Frequency) => {
  let step: number;
  let unit: 'week' | 'month';

  switch (frequency) {
    case Frequency.ONCE_A_WEEK:
      step = 1;
      unit = 'week';
      break;
    case Frequency.ONCE_A_MONTH:
      step = 1;
      unit = 'month';
      break;
    case Frequency.EVERY_TWO_WEEKS:
    default:
      step = 2;
      unit = 'week';
  }

  const numberOfUnitsBetweenStartEndCallback =
    unit === 'week' ? numberOfWeeksBetween : numberOfMonthsBetween;

  const advanceDateCallback =
    unit === 'week' ? advanceDateByWeeks : advanceDateByMonths;

  return {
    step,
    unit,
    numberOfUnitsBetweenStartEndCallback,
    advanceDateCallback
  };
};

export const getCyclicDateRanges = (options?: ServicesWorkingHoursOptions) => {
  if (
    !options?.from ||
    !options?.to ||
    !options?.frequency ||
    !(
      [
        Frequency.EVERY_TWO_WEEKS,
        Frequency.ONCE_A_MONTH,
        Frequency.ONCE_A_WEEK
      ] as Frequency[]
    ).includes(options.frequency)
  ) {
    return [
      {
        startDate: options?.from ? new Date(options?.from) : undefined,
        endDate: options?.to ? new Date(options?.to) : undefined
      }
    ];
  }

  const { from: start, to: end, frequency } = options;

  const finalDate = advanceDateByOneYear(end);

  const { step, unit } = getFrequencyHelpers(frequency);

  const numberOfUnitsBetweenStartEnd =
    unit === 'week'
      ? numberOfWeeksBetween(finalDate, start)
      : numberOfMonthsBetween(finalDate, start);

  const advanceDateCallback =
    unit === 'week' ? advanceDateByWeeks : advanceDateByMonths;

  const unitIndices = [
    ...Array<unknown>(Math.ceil((numberOfUnitsBetweenStartEnd + 1) / step))
  ].map((_, i) => i * step);

  return unitIndices.map((unitIndex) => ({
    startDate: new Date(advanceDateCallback(start, unitIndex)),
    endDate: new Date(advanceDateCallback(end, unitIndex))
  }));
};

export const flattenVisitPartsToSingleRange = (
  visitParts: TimeInterval[],
  frequency?: Frequency
) => {
  if (!frequency || frequency === Frequency.ONCE) {
    return visitParts;
  }

  const { step, advanceDateCallback } = getFrequencyHelpers(frequency);

  const result = visitParts.map((visitPart, i) => ({
    startDate: new Date(advanceDateCallback(visitPart.startDate, -i * step)),
    endDate: new Date(advanceDateCallback(visitPart.endDate, -i * step))
  }));

  return result;
};
