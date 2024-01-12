import Holidays from 'date-holidays';

import { endOfDay, startOfDay } from './dateUtils';
import { Timeslot } from './timeslotUtils';

export function getHolidaysForYear(year: number) {
  // we can think about using tsyringe to register the holidays class as a singleton
  // maybe it will be useful ffor testing the holidays
  const holidays = new Holidays('PL');

  return holidays
    .getHolidays(year)
    .filter(
      (holiday) => holiday.type === 'public' && holiday.rule !== 'easter 49'
    )
    .map((holiday) => holiday.start.toISOString());
}

export function getHolidayBusyHours(timeframe: Timeslot[]) {
  const uniqueYears = [
    ...new Set([
      ...timeframe.map((date) => new Date(date.startDate).getFullYear()),
      ...timeframe.map((date) => new Date(date.endDate).getFullYear())
    ])
  ];

  const holidays = uniqueYears.flatMap((year) => getHolidaysForYear(year));

  return holidays.flatMap((holiday) => ({
    startDate: startOfDay(holiday),
    endDate: endOfDay(holiday)
  }));
}

export function isHoliday(date: Date) {
  const holidays = new Holidays('PL');

  return holidays.isHoliday(date);
}
