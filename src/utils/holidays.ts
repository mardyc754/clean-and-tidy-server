import Holidays from 'date-holidays';

export function getHolidaysForYear(year: number) {
  // we can think about using tsyringe to register the holidays class as a singleton
  // maybe it will be useful in order to test the holidays
  const holidays = new Holidays('PL');

  return holidays
    .getHolidays(year)
    .filter(
      // for some reason, date-holidays thinks that the Zielone Świątki (easter 49)
      // are the public holidays in Poland but they aren't
      (holiday) => holiday.type === 'public' && holiday.rule !== 'easter 49'
    )
    .map((holiday) => ({
      startDate: holiday.start.toISOString(),
      endDate: holiday.end.toISOString()
    }));
}

export function isHoliday(date: Date) {
  const holidays = new Holidays('PL');

  return holidays.isHoliday(date);
}
