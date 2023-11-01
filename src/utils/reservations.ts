import {
  Frequency,
  ReservationStatus,
  type RecurringReservation,
  type Reservation
} from '@prisma/client';

import { dayjs } from '~/lib';

import {
  advanceDateByMonths,
  advanceDateByWeeks,
  displayDateWithHours,
  now,
  numberOfMonthsBetween,
  numberOfWeeksBetween
} from './dateUtils';
import { ReservationCreationData } from '~/schemas/reservation';

function createWeeklyReservations(
  reservationGroupName: string,
  firstReservationData: ReservationCreationData,
  endDate: string,
  weekSpan: number
) {
  const {
    startDate: firstReservationStartDate,
    endDate: firstReservationEndDate,
    includeDetergents,
    cost
  } = firstReservationData;

  const numberOfWeeks =
    numberOfWeeksBetween(endDate, firstReservationStartDate) + 1;

  const weekNumbers = [
    ...Array<unknown>(Math.ceil(numberOfWeeks / weekSpan))
  ].map((_, i) => i * weekSpan);

  return weekNumbers.map((week, i) => ({
    cost,
    includeDetergents,
    startDate: advanceDateByWeeks(firstReservationStartDate, week),
    endDate: advanceDateByWeeks(firstReservationEndDate, week),
    status: ReservationStatus.TO_BE_CONFIRMED,
    name: `${reservationGroupName}-${i + 1}`
  }));
}

function createMonthlyReservations(
  reservationGroupName: string,
  firstReservationData: ReservationCreationData,
  endDate: string
) {
  const {
    startDate: firstReservationStartDate,
    endDate: firstReservationEndDate,
    includeDetergents,
    cost
  } = firstReservationData;

  const numberOfMonths =
    numberOfMonthsBetween(endDate, firstReservationStartDate) + 1;

  const monthNumbers = [...Array<unknown>(numberOfMonths)].map((_, i) => i);

  return monthNumbers.map((week, i) => ({
    cost,
    includeDetergents,
    startDate: advanceDateByMonths(firstReservationStartDate, week),
    endDate: advanceDateByMonths(firstReservationEndDate, week),
    status: ReservationStatus.TO_BE_CONFIRMED,
    name: `${reservationGroupName}-${i + 1}`
  }));
}

export function createReservations(
  reservationGroupName: string,
  firstReservationData: ReservationCreationData,
  frequency: RecurringReservation['frequency'],
  endDate: string
) {
  const {
    startDate: firstReservationStartDate,
    endDate: firstReservationEndDate,
    includeDetergents,
    cost
  } = firstReservationData;

  switch (frequency) {
    case Frequency.ONCE_A_WEEK:
      return createWeeklyReservations(
        reservationGroupName,
        firstReservationData,
        endDate,
        1
      );
    case Frequency.EVERY_TWO_WEEKS:
      return createWeeklyReservations(
        reservationGroupName,
        firstReservationData,
        endDate,
        2
      );
    case Frequency.ONCE_A_MONTH:
      // TODO: wonder if the monthly reservation should be created on the same day of the month
      // or on the same day of the week but every 4 or 5 weeks
      // because sometimes it could happen that the day of the month doesn't exist
      // or the day of the month is on a weekend
      // here the proper week day handling should be implemented
      return createMonthlyReservations(
        reservationGroupName,
        firstReservationData,
        endDate
      );
    case Frequency.ONCE:
    default:
      return [
        {
          cost,
          includeDetergents,
          startDate: firstReservationStartDate,
          endDate: firstReservationEndDate,
          status: ReservationStatus.TO_BE_CONFIRMED,
          name: `${reservationGroupName}-1`
        }
      ];
  }
}

export function shouldChangeReservationFrequency(
  oldFrequency: Frequency,
  newFrequency: Frequency
) {
  return (
    oldFrequency !== newFrequency &&
    ![oldFrequency, newFrequency].includes(Frequency.ONCE)
  );
}

export function changeReservationFrequency(
  reservations: Reservation[],
  newFrequency:
    | typeof Frequency.ONCE_A_WEEK
    | typeof Frequency.EVERY_TWO_WEEKS
    | typeof Frequency.ONCE_A_MONTH,
  reservationGroupName: RecurringReservation['name']
) {
  // for safety, it'd be better to change the date to UTC

  const reservationsBefore2Weeks = reservations.filter(
    (reservation) => dayjs(reservation.startDate).diff(now()) <= 2
  );

  const newReservations = reservationsBefore2Weeks.map((reservation) => ({
    ...reservation,
    status: ReservationStatus.TO_BE_CONFIRMED
  }));

  const reservationsAfter2Weeks = reservations.filter(
    (reservation) => dayjs(reservation.startDate).diff(now()) > 2
  );

  reservationsAfter2Weeks.forEach((reservation, i) => {
    if (newFrequency === Frequency.EVERY_TWO_WEEKS) {
      if (i % 2) {
        newReservations.push({
          ...reservation,
          status: ReservationStatus.TO_BE_CONFIRMED,
          name: `${reservationGroupName}-${newReservations.length + 1}`
        });
      }
    } else if (newFrequency === Frequency.ONCE_A_WEEK) {
      const { startDate, endDate } = reservation;

      // current reservation
      newReservations.push({
        ...reservation,
        status: ReservationStatus.TO_BE_CONFIRMED,
        name: `${reservationGroupName}-${newReservations.length + 1}`
      });

      // upcoming reservation
      newReservations.push({
        ...reservation,
        status: ReservationStatus.TO_BE_CONFIRMED,
        startDate: dayjs(startDate).add(1, 'w').toDate(),
        endDate: dayjs(endDate).add(1, 'w').toDate(),
        name: `${reservationGroupName}-${newReservations.length + 1}`
      });
    }
  });

  return newReservations;
}

export function cancelReservations(
  reservations: Reservation[],
  frequency: RecurringReservation['frequency']
) {
  let newReservations: Reservation[];

  if (frequency === Frequency.ONCE) {
    newReservations = reservations.map((reservation) => ({
      ...reservation,
      status: ReservationStatus.TO_BE_CANCELLED
    }));
  } else {
    newReservations = reservations.map((reservation) =>
      dayjs(reservation.startDate).diff(now()) > 2
        ? { ...reservation, status: ReservationStatus.TO_BE_CANCELLED }
        : { ...reservation }
    );
  }

  return newReservations;
}

// TODO: Maybe split these functions into two?
// Like one function for changing the weekday of the one reservation
// and another one for recurring reservations?
export function changeWeekDay(
  reservations: Reservation[],
  weekDay: RecurringReservation['weekDay'],
  frequency: RecurringReservation['frequency']
) {
  let newReservations: Reservation[];

  if (frequency === Frequency.ONCE) {
    newReservations = reservations.map((reservation) => ({
      ...reservation,
      startDate: dayjs(reservation.startDate).day(weekDay).toDate(),
      endDate: dayjs(reservation.endDate).day(weekDay).toDate(),
      status: ReservationStatus.TO_BE_CONFIRMED
    }));
  } else {
    newReservations = reservations.map((reservation) =>
      dayjs(reservation.startDate).diff(now()) > 2
        ? {
            ...reservation,
            startDate: dayjs(reservation.startDate).day(weekDay).toDate(),
            endDate: dayjs(reservation.endDate).day(weekDay).toDate(),
            status: ReservationStatus.TO_BE_CONFIRMED
          }
        : { ...reservation }
    );
  }

  return newReservations;
}

export function changeReservationStatus(
  reservation: Reservation,
  newStatus: ReservationStatus
) {
  return {
    ...reservation,
    status: newStatus
  };
}

export function changeMultipleReservationsStatus(
  reservations: Reservation[],
  newStatus: ReservationStatus
) {
  return reservations.map((reservation) => ({
    ...reservation,
    status: newStatus
  }));
}
