import type { Employee, VisitPart } from '@prisma/client';
import { Stringified } from 'type-fest';

import {
  getTime,
  isAfter,
  isAfterOrSame,
  isBeforeOrSame
} from '~/utils/dateUtils';

type TimeInterval = {
  startDate: Date;
  endDate: Date;
};

export type EmployeeNested = {
  employee: Omit<Employee, 'password'>;
};

type EmployeeNestedWithVisitParts = EmployeeNested & {
  visitParts: VisitPart[];
};

/**
 * Calculates the busy hours by using intersection on the sets of working hours
 * @param allEmployeeWorkingHours the working hours of all employees
 * @returns the list with time intervals when all employees are busy
 */
export const calculateBusyHours = (
  allEmployeeWorkingHours: TimeInterval[][]
) => {
  let busyHours = allEmployeeWorkingHours[0] ?? [];

  allEmployeeWorkingHours.slice(1).forEach((singleEmployeeWorkingHours) => {
    const newBusyHours: TimeInterval[] = [];

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
 * This is useful when calculating busy hours for multiple services at once
 * @param busyHours
 * @returns
 */
export const mergeBusyHours = (busyHours: TimeInterval[][]) => {
  const currentInterval = {
    startDate: new Date(0),
    endDate: new Date(0)
  };

  const mergedBusyHours = busyHours.flatMap((busyHours) => busyHours);

  mergedBusyHours.sort((a, b) => getTime(a.startDate) - getTime(b.startDate));

  const newBusyHours: TimeInterval[] = [];

  mergedBusyHours.forEach((conflict, i) => {
    if (i === 0) {
      currentInterval.startDate = conflict.startDate;
      currentInterval.endDate = conflict.endDate;
    }
    const nextConflict = mergedBusyHours[i + 1];

    if (
      nextConflict &&
      isAfterOrSame(conflict.endDate, nextConflict.startDate)
    ) {
      console.log('conflict', conflict);
      console.log('nextConflict', nextConflict);
      currentInterval.endDate = nextConflict.endDate;
    } else {
      newBusyHours.push({ ...currentInterval });

      currentInterval.endDate = nextConflict
        ? nextConflict.endDate
        : conflict.endDate;
      currentInterval.startDate = nextConflict
        ? nextConflict.startDate
        : conflict.startDate;
    }
  });

  return newBusyHours;
};
