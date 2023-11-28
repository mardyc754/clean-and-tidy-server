import { dayjs } from '~/lib';

type ValidDayjsDate = dayjs.Dayjs | Date | string | number | null | undefined;

export function now() {
  return dayjs(Date.now()); // for safety, it'd be better to change the date to UTC
}

export function areStartEndDateValid(
  startDate: ValidDayjsDate,
  endDate: ValidDayjsDate,
  oldStartDate: ValidDayjsDate,
  oldEndDate: ValidDayjsDate
) {
  return (
    dayjs(startDate).diff(now(), 'day') > 2 &&
    dayjs(endDate).diff(now(), 'day') > 2 &&
    dayjs(startDate).isBefore(dayjs(endDate)) &&
    dayjs(endDate).diff(dayjs(startDate)) === 0 &&
    dayjs(startDate).diff(dayjs(oldStartDate)) < 7 &&
    dayjs(endDate).diff(dayjs(oldEndDate)) < 7
  );
}

export function hourToISOString(hourString: ValidDayjsDate) {
  return dayjs(hourString, 'HH:mm').toISOString();
}

export function extractWeekDayFromDate(date: ValidDayjsDate) {
  return dayjs(date).day();
}

export function advanceDateByOneYear(date: ValidDayjsDate) {
  return dayjs(date).add(1, 'year').toISOString();
}

export function numberOfWeeksBetween(
  endDate: ValidDayjsDate,
  startDate: ValidDayjsDate
) {
  return dayjs(endDate).diff(dayjs(startDate), 'week');
}

export function numberOfMonthsBetween(
  endDate: ValidDayjsDate,
  startDate: ValidDayjsDate
) {
  return dayjs(endDate).diff(dayjs(startDate), 'month');
}

export function advanceDateByWeeks(date: ValidDayjsDate, weeks: number) {
  return dayjs(date).add(weeks, 'week').toISOString();
}

export function advanceDateByMonths(date: ValidDayjsDate, months: number) {
  return dayjs(date).add(months, 'month').toISOString();
}

export function displayDateWithHours(date: ValidDayjsDate) {
  return dayjs(date).format('DD.MM.YYYY HH:mm');
}

export function advanceDateByHours(date: ValidDayjsDate, hours: number) {
  return dayjs(date).add(hours, 'hour');
}

export function isTheSameDay(
  firstDate: ValidDayjsDate,
  secondDate: ValidDayjsDate
) {
  return dayjs(firstDate).isSame(secondDate, 'day');
}

export function isAfter(firstDate: ValidDayjsDate, secondDate: ValidDayjsDate) {
  return dayjs(firstDate).isAfter(secondDate);
}

export function isBefore(
  firstDate: ValidDayjsDate,
  secondDate: ValidDayjsDate
) {
  return dayjs(firstDate).isBefore(secondDate);
}

export function isAfterOrSame(
  firstDate: ValidDayjsDate,
  secondDate: ValidDayjsDate
) {
  return (
    dayjs(firstDate).isAfter(secondDate) || dayjs(firstDate).isSame(secondDate)
  );
}

export function isBeforeOrSame(
  firstDate: ValidDayjsDate,
  secondDate: ValidDayjsDate
) {
  return (
    dayjs(firstDate).isBefore(secondDate) || dayjs(firstDate).isSame(secondDate)
  );
}

export const getTime = (date: ValidDayjsDate) => dayjs(date).toDate().getTime();
