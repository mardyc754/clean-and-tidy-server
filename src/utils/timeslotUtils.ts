import { type Employee, Frequency, Status, type VisitPart } from '@prisma/client';

import {
  ValidDayjsDate,
  advanceDateByDays,
  advanceDateByMinutes,
  advanceDateByMonths,
  advanceDateByOneYear,
  advanceDateByWeeks,
  dateFromMonthAndYear,
  endOfDay,
  endOfMonth,
  getTime,
  hoursBetween,
  isAfter,
  isAfterOrSame,
  isBeforeOrSame,
  isTheSameDay,
  minutesBetween,
  numberOfMonthsBetween,
  numberOfWeeksBetween,
  startOfDay,
  startOfMonth,
  startOfWeek
} from '~/utils/dateUtils';

import { getHolidayBusyHours } from './holidays';

export type Timeslot = {
  startDate: Date;
  endDate: Date;
};

export type EmployeeNested = {
  employee: Omit<Employee, 'password'>;
};

type EmployeeWithServicesAndVisitParts = Omit<Employee, 'password'> & {
  services: Array<{
    employeeId: number;
    serviceId: number;
    visitParts: VisitPart[];
  }>;
};

export const getFrequencyHelpers = (frequency: Frequency | undefined) => {
  let step: number;
  let unit: 'week' | 'month' | undefined = undefined;
  let numberOfUnitsBetweenStartEndCallback:
    | ((endDate: ValidDayjsDate, startDate: ValidDayjsDate) => number)
    | undefined = undefined;
  let advanceDateCallback: ((date: ValidDayjsDate, step: number) => Date) | undefined = undefined;
  switch (frequency) {
    case Frequency.ONCE_A_WEEK:
      step = 1;
      unit = 'week';
      numberOfUnitsBetweenStartEndCallback = numberOfWeeksBetween;
      advanceDateCallback = advanceDateByWeeks;
      break;
    case Frequency.ONCE_A_MONTH:
      step = 1;
      unit = 'month';
      numberOfUnitsBetweenStartEndCallback = numberOfMonthsBetween;
      advanceDateCallback = advanceDateByMonths;
      break;
    case Frequency.EVERY_TWO_WEEKS:
      step = 2;
      unit = 'week';
      numberOfUnitsBetweenStartEndCallback = numberOfWeeksBetween;
      advanceDateCallback = advanceDateByWeeks;
      break;
    default:
      step = 0;
  }

  return {
    step,
    unit,
    numberOfUnitsBetweenStartEndCallback,
    advanceDateCallback
  };
};

const numberOfWorkingHours = (workingHours: Timeslot[]) => {
  return workingHours.reduce((acc, curr) => acc + hoursBetween(curr.startDate, curr.endDate), 0);
};

/**
 * Calculate employees working hours by adding breaks between visit parts
 * where the break is at least 30 minutes
 * @param timeslots timeslots for which we want to calculate working hours
 * @returns calculated working hours
 *
 * NOTE: for the days where the total number of working hours is greater than 8,
 * then the whole day is marked as a working day
 */
const calculateEmployeeWorkingHours = (timeslots: Timeslot[]) => {
  const uniqueDays = Array.from(
    new Set(timeslots.map((timeslot) => startOfDay(timeslot.startDate)))
  );

  const currentTimeslot = {
    startDate: new Date(0),
    endDate: new Date(0)
  };

  uniqueDays.sort((a, b) => getTime(a) - getTime(b));

  const workingHours: Timeslot[] = [];

  uniqueDays.forEach((day) => {
    const dayTimeslots = timeslots.filter((timeslot) => isTheSameDay(timeslot.startDate, day));

    dayTimeslots.sort((a, b) => getTime(a.startDate) - getTime(b.startDate));

    const workingHoursForDay: Timeslot[] = [];

    dayTimeslots.forEach((timeslot, i) => {
      if (i === 0) {
        currentTimeslot.startDate = advanceDateByMinutes(timeslot.startDate, -30);
        currentTimeslot.endDate = timeslot.endDate;
      }

      const nextTimeslot = dayTimeslots[i + 1];

      if (nextTimeslot && minutesBetween(nextTimeslot?.startDate, currentTimeslot.endDate) <= 30) {
        currentTimeslot.endDate = nextTimeslot.endDate;
      } else {
        workingHoursForDay.push({ ...currentTimeslot });

        currentTimeslot.startDate = nextTimeslot
          ? advanceDateByMinutes(nextTimeslot.startDate, -30)
          : timeslot.startDate;
        currentTimeslot.endDate = nextTimeslot ? nextTimeslot.endDate : timeslot.startDate;
      }
    });

    const numberOfHoursInADay = numberOfWorkingHours(workingHoursForDay);

    if (numberOfHoursInADay < 8) {
      workingHours.push(...workingHoursForDay);
    } else {
      workingHours.push({ startDate: startOfDay(day), endDate: endOfDay(day) });
    }
  });

  return workingHours;
};

/**
 * Calculate employee busy hours by adding extra half an hour before and after visit parts
 * @param timeslots original working hours timeslots for which we want to calculate busy hours
 * @returns calculated busy hours
 *
 * NOTE: for the days where the total number of working hours is greater than 8,
 * then the whole day is marked as busy
 */
const calculateEmployeeBusyHours = (timeslots: Timeslot[]) => {
  const uniqueDays = Array.from(
    new Set(timeslots.map((timeslot) => startOfDay(timeslot.startDate)))
  );

  uniqueDays.sort((a, b) => getTime(a) - getTime(b));

  const busyHours: Timeslot[] = [];

  const workingHours = sumOfTimeslots([
    timeslots.map((workingHour) => ({
      startDate: advanceDateByMinutes(workingHour.startDate, -30),
      endDate: advanceDateByMinutes(workingHour.endDate, 30)
    }))
  ]);

  uniqueDays.forEach((day) => {
    const dayTimeslots = workingHours.filter((timeslot) => isTheSameDay(timeslot.startDate, day));
    dayTimeslots.sort((a, b) => getTime(a.startDate) - getTime(b.startDate));
    const numberOfHoursInADay = numberOfWorkingHours(dayTimeslots);

    if (numberOfHoursInADay < 8) {
      busyHours.push(...dayTimeslots);
    } else {
      busyHours.push({
        startDate: startOfDay(day),
        endDate: endOfDay(day)
      });
    }
  });

  const uniqueWeeks = Array.from(
    new Set(busyHours.map((timeslot) => startOfWeek(timeslot.startDate)))
  );

  uniqueWeeks.sort((a, b) => getTime(a) - getTime(b));

  const busyHoursForWeeks: Timeslot[] = [];

  uniqueWeeks.forEach((week) => {
    const weekDays = Array(7)
      .fill(0)
      .map((_, i) => startOfDay(advanceDateByDays(week, i)));

    const weekTimeslots = busyHours.filter((timeslot) =>
      isTheSameDay(startOfWeek(timeslot.startDate), week)
    );

    busyHoursForWeeks.push(...weekTimeslots);

    const busyDays = weekDays.filter((day) =>
      uniqueDays.some((uniqueDay) => isTheSameDay(day, uniqueDay))
    );

    if (busyDays.length >= 5) {
      const remainingDays = weekDays.filter(
        (day) => !busyDays.some((busyDay) => isTheSameDay(day, busyDay))
      );

      busyHoursForWeeks.push(
        ...remainingDays.map((day) => ({
          startDate: startOfDay(day),
          endDate: endOfDay(day)
        }))
      );
    }
  });

  const holidayBusyHours = getHolidayBusyHours(busyHours);
  return sumOfTimeslots([busyHoursForWeeks, holidayBusyHours]);
};

const normalizeBusyHoursFromSingleCycle = (
  range: Timeslot,
  rangeIndex: number,
  employeeWorkingHours: Timeslot[],
  frequency: Frequency
) => {
  const { step, advanceDateCallback } = getFrequencyHelpers(frequency);
  const { startDate, endDate } = range;

  const employeeVisitsInTimeRange = employeeWorkingHours.filter(
    (visitPart) =>
      isAfterOrSame(visitPart.startDate, startDate) && isBeforeOrSame(visitPart.endDate, endDate)
  );

  const holidaysInTimeRange = getHolidayBusyHours(employeeVisitsInTimeRange).map(
    (holiday) => holiday.startDate
  );

  const employeeBusyHoursInTimeRange: Timeslot[] = [];

  employeeVisitsInTimeRange.forEach((visitPart) => {
    const visitPartStartDate = visitPart.startDate;
    const isHoliday = holidaysInTimeRange.some((holiday) =>
      isTheSameDay(holiday, visitPart.startDate)
    );

    if (!isHoliday) {
      employeeBusyHoursInTimeRange.push(visitPart);
      return;
    }

    // if the visit part starts on a holiday, then consider visit part from the next day which is not a holiday
    // and then treat the visit part as if it started on the previous day
    let dayIncrement = 1;
    let nextDay = startOfDay(advanceDateByDays(visitPartStartDate, dayIncrement));
    while (holidaysInTimeRange.some((holiday) => isTheSameDay(holiday, nextDay))) {
      dayIncrement++;
      nextDay = startOfDay(advanceDateByDays(visitPartStartDate, dayIncrement));
    }

    const nextDayBusyHours = employeeVisitsInTimeRange.filter((visitPart) =>
      isTheSameDay(visitPart.startDate, nextDay)
    );

    nextDayBusyHours.sort((a, b) => getTime(a.startDate) - getTime(b.startDate));

    nextDayBusyHours.forEach((visitPart) => {
      const newVisitPart = {
        startDate: advanceDateByDays(visitPart.startDate, -dayIncrement),
        endDate: advanceDateByDays(visitPart.endDate, -dayIncrement)
      };
      employeeBusyHoursInTimeRange.push(newVisitPart);
    });
  });

  return employeeBusyHoursInTimeRange.map((visitPart) =>
    // flatten visit parts to single range
    advanceDateCallback
      ? {
          startDate: new Date(advanceDateCallback(visitPart.startDate, -rangeIndex * step)),
          endDate: new Date(advanceDateCallback(visitPart.endDate, -rangeIndex * step))
        }
      : visitPart
  );
};

const getSingleEmployeeBusyHours = (
  employee: EmployeeWithServicesAndVisitParts,
  cyclicRanges: Timeslot[] | null,
  frequency: Frequency = Frequency.ONCE
) => {
  // add half an hour before and after the visit
  // and include holidays as busy hours
  const employeeWorkingHours = calculateEmployeeBusyHours(
    employee.services.flatMap((service) =>
      service.visitParts
        .filter(
          (visitPart) => visitPart.status !== Status.CANCELLED && visitPart.status !== Status.CLOSED
        )
        .map((visitPart) => ({
          startDate: visitPart.startDate,
          endDate: visitPart.endDate
        }))
    )
  );

  // flatten visit parts to single range
  const normalizedBusyHours =
    cyclicRanges?.map((range, i) =>
      normalizeBusyHoursFromSingleCycle(range, i, employeeWorkingHours, frequency)
    ) ?? employeeWorkingHours.map((visitPart) => [visitPart]);

  return {
    ...employee,
    services: employee.services.map((service) => service.serviceId),
    // squash visit part dates into single range
    // and merge the busy hours
    workingHours: sumOfTimeslots(normalizedBusyHours),
    // for calculating the number of working hours
    // we need the working hours with added extra time
    // only before the visit
    numberOfWorkingHours: numberOfWorkingHours(
      calculateEmployeeWorkingHours(employee.services.flatMap((service) => service.visitParts))
    )
  };
};

/**
 * Create date ranges for cyclic reservations
 * @param year the start year of calculating the cyclic date ranges
 * @param month the start month of calculating the cyclic date ranges
 * @param frequency the frequency of the visits, determining the step, unit and number of cycles
 * @returns the cyclic date ranges in the intervals based on the frequency
 */
export const getCyclicDateRanges = (year?: number, month?: number, frequency?: Frequency) => {
  if (month === undefined || year === undefined) {
    return null;
  }

  const queryDate = dateFromMonthAndYear(month, year);
  const start = new Date(startOfMonth(queryDate));
  const end = new Date(endOfMonth(queryDate));
  const { step, advanceDateCallback, numberOfUnitsBetweenStartEndCallback } =
    getFrequencyHelpers(frequency);

  if (!advanceDateCallback || !numberOfUnitsBetweenStartEndCallback) {
    return [
      {
        startDate: start,
        endDate: end
      }
    ];
  }

  const finalDate = advanceDateByOneYear(end);

  const numberOfUnitsBetweenStartEnd = numberOfUnitsBetweenStartEndCallback(finalDate, start);

  const unitIndices = [...Array<unknown>(Math.ceil((numberOfUnitsBetweenStartEnd + 1) / step))].map(
    (_, i) => i * step
  );

  return unitIndices.map((unitIndex) => ({
    startDate: new Date(advanceDateCallback(start, unitIndex)),
    endDate: new Date(advanceDateCallback(end, unitIndex))
  }));
};

/**
 * Calculates the busy hours by using intersection on the sets of working hours
 * @param allEmployeeWorkingHours the working hours of all employees
 * @returns the list with time intervals when all employees are busy
 */
export const timeslotsIntersection = (allEmployeeWorkingHours: Timeslot[][]) => {
  let busyHours = allEmployeeWorkingHours[0] ?? [];

  allEmployeeWorkingHours.slice(1).forEach((singleEmployeeWorkingHours) => {
    const newBusyHours: Timeslot[] = [];

    // check the hour conflicts between employees
    // by comparing employee working hours with the rest of the employees
    singleEmployeeWorkingHours.forEach((interval) => {
      const conflicts = busyHours.filter(
        (busyInterval) =>
          // four cases:
          // - interval starts before and finishes while busy
          // - interval is contained inside busy interval
          // - busy interval contains interval
          // - interval starts while busy and finishes after
          isAfter(interval.endDate, busyInterval.startDate) &&
          isAfter(busyInterval.endDate, interval.startDate)
      );

      conflicts.forEach((conflict) => {
        newBusyHours.push({
          startDate: isAfter(interval.startDate, conflict.startDate)
            ? interval.startDate
            : conflict.startDate,
          endDate: isAfter(interval.endDate, conflict.endDate) ? conflict.endDate : interval.endDate
        });
      });
    });

    busyHours = [...newBusyHours];
  });

  return busyHours;
};

/**
 * Merges busy hours into larger intervals
 * by using the sum of the sets of working hours
 *
 * This is useful when calculating busy hours for multiple services at once
 * @param busyHours
 * @returns
 */
export const sumOfTimeslots = (busyHours: Timeslot[][]) => {
  const currentTimeslot = {
    startDate: new Date(0),
    endDate: new Date(0)
  };

  const mergedBusyHours = busyHours.flatMap((busyHours) => busyHours);

  mergedBusyHours.sort((a, b) => getTime(a.startDate) - getTime(b.startDate));

  const newBusyHours: Timeslot[] = [];

  mergedBusyHours.forEach((timeslot, i) => {
    if (i === 0) {
      currentTimeslot.startDate = timeslot.startDate;
      currentTimeslot.endDate = timeslot.endDate;
    }
    const nextTimeslot = mergedBusyHours[i + 1];

    if (nextTimeslot && isAfterOrSame(currentTimeslot.endDate, nextTimeslot.startDate)) {
      currentTimeslot.endDate = isBeforeOrSame(currentTimeslot.endDate, nextTimeslot.endDate)
        ? nextTimeslot.endDate
        : currentTimeslot.endDate;
    } else {
      newBusyHours.push({ ...currentTimeslot });

      currentTimeslot.endDate = nextTimeslot ? nextTimeslot.endDate : timeslot.endDate;
      currentTimeslot.startDate = nextTimeslot ? nextTimeslot.startDate : timeslot.startDate;
    }
  });

  return newBusyHours;
};

export const getEmployeesBusyHoursData = (
  employees: EmployeeWithServicesAndVisitParts[],
  cyclicRanges: Timeslot[] | null,
  frequency: Frequency = Frequency.ONCE
) => {
  // employees working hours calculation
  const employeesWithWorkingHours = employees.map((employee) =>
    getSingleEmployeeBusyHours(employee, cyclicRanges, frequency)
  );

  // flatten visit parts to single range
  const flattenedEmployeeVisitParts = employeesWithWorkingHours.map(
    (employee) => employee.workingHours
  );

  return { employeesWithWorkingHours, flattenedEmployeeVisitParts };
};
