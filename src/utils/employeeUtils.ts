import { type Employee, Frequency, type VisitPart } from '@prisma/client';
import { Stringified } from 'type-fest';

import {
  EmployeeWorkingHoursOptions,
  ServicesWorkingHoursOptions
} from '~/schemas/employee';

import {
  advanceDateByDays,
  advanceDateByMinutes,
  endOfDay,
  getTime,
  hoursBetween,
  isAfter,
  isAfterOrSame,
  isBeforeOrSame,
  isTheSameDay,
  minutesBetween,
  startOfDay,
  startOfWeek
} from '~/utils/dateUtils';

import { getFrequencyHelpers } from './reservationUtils';

export type Timeslot = {
  startDate: Date;
  endDate: Date;
};

export type EmployeeNested = {
  employee: Omit<Employee, 'password'>;
};

type EmployeeNestedWithVisitParts = EmployeeNested & {
  visitParts: VisitPart[];
};

type EmployeeWithServicesAndVisitParts = Omit<Employee, 'password'> & {
  services: Array<{
    employeeId: number;
    serviceId: number;
    visitParts: Timeslot[];
  }>;
};

/**
 * Calculates the busy hours by using intersection on the sets of working hours
 * @param allEmployeeWorkingHours the working hours of all employees
 * @returns the list with time intervals when all employees are busy
 */
export const calculateBusyHours = (allEmployeeWorkingHours: Timeslot[][]) => {
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
          endDate: isAfter(interval.endDate, conflict.endDate)
            ? conflict.endDate
            : interval.endDate
        });
      });
    });

    busyHours = [...newBusyHours];
  });

  return busyHours;
};

export const getEmployeeWithWorkingHours = (
  employee: EmployeeNestedWithVisitParts
) => {
  return {
    ...employee.employee,
    workingHours: employee.visitParts.map((visitPart) => ({
      startDate: visitPart.startDate,
      endDate: visitPart.endDate
    }))
  };
};

/**
 * Merges busy hours into larger intervals
 * by using the sum of the sets of working hours
 *
 * This is useful when calculating busy hours for multiple services at once
 * @param busyHours
 * @returns
 */
export const mergeBusyHours = (busyHours: Timeslot[][]) => {
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

    if (
      nextTimeslot &&
      isAfterOrSame(currentTimeslot.endDate, nextTimeslot.startDate)
    ) {
      currentTimeslot.endDate = isBeforeOrSame(
        currentTimeslot.endDate,
        nextTimeslot.endDate
      )
        ? nextTimeslot.endDate
        : currentTimeslot.endDate;
    } else {
      newBusyHours.push({ ...currentTimeslot });

      currentTimeslot.endDate = nextTimeslot
        ? nextTimeslot.endDate
        : timeslot.endDate;
      currentTimeslot.startDate = nextTimeslot
        ? nextTimeslot.startDate
        : timeslot.startDate;
    }
  });

  return newBusyHours;
};

export const numberOfWorkingHours = (workingHours: Timeslot[]) => {
  return workingHours.reduce(
    (acc, curr) => acc + hoursBetween(curr.startDate, curr.endDate),
    0
  );
};

export const addBreaksToWorkingHours = (workingHours: Timeslot[]) => {
  // we can think about not reducing the first start date by half an hour
  // but frontend should be able to handle this
  return workingHours.map((workingHour) => ({
    startDate: advanceDateByMinutes(workingHour.startDate, -30),
    endDate: advanceDateByMinutes(workingHour.endDate, 30)
  }));
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
export const calculateEmployeeWorkingHours = (timeslots: Timeslot[]) => {
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
    const dayTimeslots = timeslots.filter((timeslot) =>
      isTheSameDay(timeslot.startDate, day)
    );

    dayTimeslots.sort((a, b) => getTime(a.startDate) - getTime(b.startDate));

    const workingHoursForDay: Timeslot[] = [];

    dayTimeslots.forEach((timeslot, i) => {
      if (i === 0) {
        currentTimeslot.startDate = advanceDateByMinutes(
          timeslot.startDate,
          -30
        );
        currentTimeslot.endDate = timeslot.endDate;
      }

      const nextTimeslot = dayTimeslots[i + 1];

      if (
        nextTimeslot &&
        minutesBetween(nextTimeslot?.startDate, currentTimeslot.endDate) <= 30
      ) {
        currentTimeslot.endDate = nextTimeslot.endDate;
      } else {
        workingHoursForDay.push({ ...currentTimeslot });

        currentTimeslot.startDate = nextTimeslot
          ? advanceDateByMinutes(nextTimeslot.startDate, -30)
          : timeslot.startDate;
        currentTimeslot.endDate = nextTimeslot
          ? nextTimeslot.endDate
          : timeslot.startDate;
      }
    });

    const numberOfHoursInADay = numberOfWorkingHours(workingHoursForDay);

    if (numberOfHoursInADay < 8) {
      workingHours.push(...workingHoursForDay);
    } else {
      workingHours.push({ startDate: startOfDay(day), endDate: endOfDay(day) });
    }
  });

  // return calculateBusyHoursForWeeks(workingHours);
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
export const calculateEmployeeBusyHours = (timeslots: Timeslot[]) => {
  const uniqueDays = Array.from(
    new Set(timeslots.map((timeslot) => startOfDay(timeslot.startDate)))
  );

  uniqueDays.sort((a, b) => getTime(a) - getTime(b));

  const busyHours: Timeslot[] = [];

  const workingHours = mergeBusyHours([addBreaksToWorkingHours(timeslots)]);

  uniqueDays.forEach((day) => {
    const dayTimeslots = workingHours.filter((timeslot) =>
      isTheSameDay(timeslot.startDate, day)
    );

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

  return calculateBusyHoursForWeeks(busyHours);
};

const calculateBusyHoursForWeeks = (busyHours: Timeslot[]) => {
  const uniqueDays = Array.from(
    new Set(busyHours.map((timeslot) => startOfDay(timeslot.startDate)))
  );

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
  // return busyHours;
  return mergeBusyHours([busyHoursForWeeks]);
};

export const getEmployeesBusyHours = (
  employees: EmployeeWithServicesAndVisitParts[],
  cyclicRanges: Timeslot[] | null,
  options?: EmployeeWorkingHoursOptions | ServicesWorkingHoursOptions
) => {
  // employees working hours calculation
  const employeesWithWorkingHours = employees.map((employee) => {
    // add half an hour before and after the visit
    const employeeWorkingHours = calculateEmployeeBusyHours(
      employee.services.flatMap((service) => service.visitParts)
    );

    // flatten visit parts to single range
    const busyHoursForTimeslots =
      cyclicRanges?.map((range, i) => {
        const { startDate, endDate } = range;

        const employeeVisitsInTimeRange = employeeWorkingHours.filter(
          (visitPart) =>
            isAfterOrSame(visitPart.startDate, startDate) &&
            isBeforeOrSame(visitPart.endDate, endDate)
        );

        const { step, advanceDateCallback } = getFrequencyHelpers(
          options?.frequency as Frequency
        );

        return employeeVisitsInTimeRange.map((visitPart) => {
          // flatten visit parts to single range
          return {
            startDate: new Date(
              advanceDateCallback
                ? (advanceDateCallback(
                    visitPart.startDate,
                    -i * step
                  ) as string)
                : visitPart.startDate
            ),
            endDate: new Date(
              advanceDateCallback
                ? (advanceDateCallback(visitPart.endDate, -i * step) as string)
                : visitPart.endDate
            )
          };
        });
      }) ?? employeeWorkingHours.map((visitPart) => [visitPart]);

    return {
      ...employee,
      services: employee.services.map((service) => service.serviceId),
      // squash visit part dates into single range
      // and merge the busy hours
      workingHours: mergeBusyHours(busyHoursForTimeslots),
      // for calculating the number of working hours
      // we need the working hours with added extra time
      // only before the visit
      numberOfWorkingHours: numberOfWorkingHours(
        calculateEmployeeWorkingHours(
          employee.services.flatMap((service) => service.visitParts)
        )
      )
    };
  });

  // flatten visit parts to single range
  const flattenedEmployeeVisitParts = employeesWithWorkingHours.map(
    (employee) => employee.workingHours
  );

  return { employeesWithWorkingHours, flattenedEmployeeVisitParts };
};
