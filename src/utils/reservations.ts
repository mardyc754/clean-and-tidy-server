import {
  Frequency,
  type Reservation,
  Status,
  type Visit
} from '@prisma/client';

import { dayjs } from '~/lib';

import { VisitCreationData } from '~/schemas/visit';

import {
  advanceDateByMonths,
  advanceDateByWeeks,
  displayDateWithHours,
  now,
  numberOfMonthsBetween,
  numberOfWeeksBetween
} from './dateUtils';

function createWeeklyVisits(
  reservationName: string,
  firstVisitData: VisitCreationData,
  endDate: string,
  weekSpan: number
) {
  const {
    startDate: firstVisitStartDate,
    endDate: firstVisitEndDate,
    includeDetergents,
    cost
  } = firstVisitData;

  const numberOfWeeks = numberOfWeeksBetween(endDate, firstVisitStartDate) + 1;

  const weekNumbers = [
    ...Array<unknown>(Math.ceil(numberOfWeeks / weekSpan))
  ].map((_, i) => i * weekSpan);

  return weekNumbers.map((week, i) => ({
    cost,
    includeDetergents,
    startDate: advanceDateByWeeks(firstVisitStartDate, week),
    endDate: advanceDateByWeeks(firstVisitEndDate, week),
    status: Status.TO_BE_CONFIRMED,
    name: `${reservationName}-${i + 1}`
  }));
}

function createMonthlyVisits(
  reservationName: string,
  firstVisitData: VisitCreationData,
  endDate: string
) {
  const {
    startDate: firstVisitStartDate,
    endDate: firstVisitEndDate,
    includeDetergents,
    cost
  } = firstVisitData;

  const numberOfMonths =
    numberOfMonthsBetween(endDate, firstVisitStartDate) + 1;

  const monthNumbers = [...Array<unknown>(numberOfMonths)].map((_, i) => i);

  return monthNumbers.map((week, i) => ({
    cost,
    includeDetergents,
    startDate: advanceDateByMonths(firstVisitStartDate, week),
    endDate: advanceDateByMonths(firstVisitEndDate, week),
    status: Status.TO_BE_CONFIRMED,
    name: `${reservationName}-${i + 1}`
  }));
}

export function createVisits(
  reservationName: string,
  firstVisitData: VisitCreationData,
  frequency: Reservation['frequency'],
  endDate: string
) {
  const {
    startDate: firstVisitStartDate,
    endDate: firstVisitEndDate,
    includeDetergents,
    cost
  } = firstVisitData;

  switch (frequency) {
    case Frequency.ONCE_A_WEEK:
      return createWeeklyVisits(reservationName, firstVisitData, endDate, 1);
    case Frequency.EVERY_TWO_WEEKS:
      return createWeeklyVisits(reservationName, firstVisitData, endDate, 2);
    case Frequency.ONCE_A_MONTH:
      // TODO: wonder if the monthly reservation should be created on the same day of the month
      // or on the same day of the week but every 4 or 5 weeks
      // because sometimes it could happen that the day of the month doesn't exist
      // or the day of the month is on a weekend
      // here the proper week day handling should be implemented
      return createMonthlyVisits(reservationName, firstVisitData, endDate);
    case Frequency.ONCE:
    default:
      return [
        {
          cost,
          includeDetergents,
          startDate: firstVisitStartDate,
          endDate: firstVisitEndDate,
          status: Status.TO_BE_CONFIRMED,
          name: `${reservationName}-1`
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

export function changeVisitFrequency(
  visits: Visit[],
  newFrequency:
    | typeof Frequency.ONCE_A_WEEK
    | typeof Frequency.EVERY_TWO_WEEKS
    | typeof Frequency.ONCE_A_MONTH,
  reservationName: Visit['name']
) {
  // for safety, it'd be better to change the date to UTC

  const visitsBefore2Weeks = visits.filter(
    (visit) => dayjs(visit.startDate).diff(now()) <= 2
  );

  const newVisit = visitsBefore2Weeks.map((visit) => ({
    ...visit,
    status: Status.TO_BE_CONFIRMED
  }));

  const visitsAfter2Weeks = visits.filter(
    (visit) => dayjs(visit.startDate).diff(now()) > 2
  );

  visitsAfter2Weeks.forEach((visit, i) => {
    if (newFrequency === Frequency.EVERY_TWO_WEEKS) {
      if (i % 2) {
        newVisit.push({
          ...visit,
          status: Status.TO_BE_CONFIRMED,
          name: `${reservationName}-${newVisit.length + 1}`
        });
      }
    } else if (newFrequency === Frequency.ONCE_A_WEEK) {
      const { startDate, endDate } = visit;

      // current visit
      newVisit.push({
        ...visit,
        status: Status.TO_BE_CONFIRMED,
        name: `${reservationName}-${newVisit.length + 1}`
      });

      // upcoming visit
      newVisit.push({
        ...visit,
        status: Status.TO_BE_CONFIRMED,
        startDate: dayjs(startDate).add(1, 'w').toDate(),
        endDate: dayjs(endDate).add(1, 'w').toDate(),
        name: `${reservationName}-${newVisit.length + 1}`
      });
    }
  });

  return newVisit;
}

export function cancelVisits(
  visits: Visit[],
  frequency: Reservation['frequency']
) {
  let newVisits: Visit[];

  if (frequency === Frequency.ONCE) {
    newVisits = visits.map((visit) => ({
      ...visit,
      status: Status.TO_BE_CANCELLED
    }));
  } else {
    newVisits = visits.map((visit) =>
      dayjs(visit.startDate).diff(now()) > 2
        ? { ...visit, status: Status.TO_BE_CANCELLED }
        : { ...visit }
    );
  }

  return newVisits;
}

// TODO: Maybe split these functions into two?
// Like one function for changing the weekday of the one reservation
// and another one for recurring reservations?
export function changeWeekDay(
  visits: Visit[],
  weekDay: Reservation['weekDay'],
  frequency: Reservation['frequency']
) {
  let newVisits: Visit[];

  if (frequency === Frequency.ONCE) {
    newVisits = visits.map((reservation) => ({
      ...reservation,
      startDate: dayjs(reservation.startDate).day(weekDay).toDate(),
      endDate: dayjs(reservation.endDate).day(weekDay).toDate(),
      status: Status.TO_BE_CONFIRMED
    }));
  } else {
    newVisits = visits.map((reservation) =>
      dayjs(reservation.startDate).diff(now()) > 2
        ? {
            ...reservation,
            startDate: dayjs(reservation.startDate).day(weekDay).toDate(),
            endDate: dayjs(reservation.endDate).day(weekDay).toDate(),
            status: Status.TO_BE_CONFIRMED
          }
        : { ...reservation }
    );
  }

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
