import { dayjs } from '~/lib';

export type ValidDayjsDate = dayjs.Dayjs | Date | string | number | null | undefined;

export function now() {
  return dayjs(Date.now()); // for safety, it'd be better to change the date to UTC
}

export function isNewStartDateValid(startDate: ValidDayjsDate, oldStartDate: ValidDayjsDate) {
  return (
    // dayjs(startDate).diff(now(), 'day') > 2 &&
    // dayjs(startDate).diff(now(), 'day') > 1 &&
    dayjs(startDate).diff(oldStartDate, 'day') < 7
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

export function numberOfDaysBetween(endDate: ValidDayjsDate, startDate: ValidDayjsDate) {
  return dayjs(endDate).diff(dayjs(startDate), 'day');
}

export function numberOfWeeksBetween(endDate: ValidDayjsDate, startDate: ValidDayjsDate) {
  return dayjs(endDate).diff(dayjs(startDate), 'week');
}

export function numberOfMonthsBetween(endDate: ValidDayjsDate, startDate: ValidDayjsDate) {
  return dayjs(endDate).diff(dayjs(startDate), 'month');
}

export function advanceDateByDays(date: ValidDayjsDate, days: number) {
  return dayjs(date).add(days, 'day').toDate();
}

export function advanceDateByWeeks(date: ValidDayjsDate, weeks: number) {
  return dayjs(date).add(weeks, 'week').toDate();
}

export function advanceDateByMonths(date: ValidDayjsDate, months: number) {
  return dayjs(date).add(months, 'month').toDate();
}

export function displayDateWithHours(date: ValidDayjsDate) {
  return dayjs(date).format('DD.MM.YYYY HH:mm');
}

export function advanceDateByHours(date: ValidDayjsDate, hours: number) {
  return dayjs(date).add(hours, 'hour');
}

export function advanceDateByMinutes(date: ValidDayjsDate, minutes: number) {
  return dayjs(date).add(minutes, 'm').toDate();
}

export function isTheSameDay(firstDate: ValidDayjsDate, secondDate: ValidDayjsDate) {
  return dayjs(firstDate).isSame(secondDate, 'day');
}

export function isAfter(firstDate: ValidDayjsDate, secondDate: ValidDayjsDate) {
  return dayjs(firstDate).isAfter(secondDate);
}

export function isBefore(firstDate: ValidDayjsDate, secondDate: ValidDayjsDate) {
  return dayjs(firstDate).isBefore(secondDate);
}

export function isAfterOrSame(firstDate: ValidDayjsDate, secondDate: ValidDayjsDate) {
  return dayjs(firstDate).isAfter(secondDate) || dayjs(firstDate).isSame(secondDate);
}

export function isBeforeOrSame(firstDate: ValidDayjsDate, secondDate: ValidDayjsDate) {
  return dayjs(firstDate).isBefore(secondDate) || dayjs(firstDate).isSame(secondDate);
}

export const getTime = (date: ValidDayjsDate) => dayjs(date).toDate().getTime();

export const hoursBetween = (startDate: ValidDayjsDate, endDate: ValidDayjsDate) =>
  dayjs(endDate).diff(dayjs(startDate), 'hour', true);

export const minutesBetween = (startDate: ValidDayjsDate, endDate: ValidDayjsDate) =>
  dayjs(endDate).diff(dayjs(startDate), 'minute');

export const startOfDay = (date: ValidDayjsDate) => dayjs(date).startOf('day').toDate();

export const endOfDay = (date: ValidDayjsDate) => dayjs(date).endOf('day').toDate();

export const startOfWeek = (date: ValidDayjsDate) => dayjs(date).startOf('week').toDate();

export const getYearFromDate = (date: ValidDayjsDate) => dayjs(date).year();

export const getWeekNumberFromDate = (date: ValidDayjsDate) => dayjs(date).week();

export const startOfMonth = (date: ValidDayjsDate) => dayjs(date).startOf('month').toDate();

export const endOfMonth = (date: ValidDayjsDate) => dayjs(date).endOf('month').toDate();

export const dateFromMonthAndYear = (month: number, year: number) => {
  return dayjs().year(year).month(month).toDate();
};

export const isAtLeastOneDayBetween = (start: ValidDayjsDate, end: ValidDayjsDate) => {
  return dayjs(end).diff(start, 'hours') >= 24;
};
