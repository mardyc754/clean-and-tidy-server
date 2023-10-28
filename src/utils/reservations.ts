import {
  Frequency,
  ReservationStatus,
  type RecurringReservation,
  type Reservation
} from '@prisma/client';

import { dayjs } from '~/lib';

import { advanceDateByWeeks, now, numberOfWeeksBetween } from './dateUtils';
import { ReservationCreationData } from '~/schemas/reservation';

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

  let weekNumbers: number[];

  // by using dayjs(date1).diif(date2, 'week'),
  // we can count number of the weeks ocurring between start and end date
  // and we do not have to use magic numbers in that case
  const numberOfWeeks = numberOfWeeksBetween(
    endDate,
    firstReservationStartDate
  );

  switch (frequency) {
    case Frequency.ONCE_A_WEEK:
      weekNumbers = [...Array<unknown>(numberOfWeeks)].map((_, i) => i);
      break;
    case Frequency.EVERY_TWO_WEEKS:
      weekNumbers = [...Array<unknown>(Math.ceil(numberOfWeeks / 2))].map(
        (_, i) => 2 * i
      );
      break;
    case Frequency.ONCE:
    default:
      weekNumbers = [0];
  }

  return weekNumbers.map((week, i) => ({
    cost,
    includeDetergents,
    startDate: advanceDateByWeeks(firstReservationStartDate, week),
    endDate: advanceDateByWeeks(firstReservationEndDate, week),
    status: ReservationStatus.TO_BE_CONFIRMED,
    name: `${reservationGroupName}-${i + 1}`
  }));
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
