import { dayjs } from '~/lib';

export function now() {
  return dayjs(Date.now()); // for safety, it'd be better to change the date to UTC
}

export function areStartEndDateValid(
  startDate: Date,
  endDate: Date,
  oldStartDate: Date,
  oldEndDate: Date
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

export function hourToISOString(hourString: string) {
  return dayjs(hourString, 'HH:mm').toISOString();
}
