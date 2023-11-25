import { Prisma } from '@prisma/client';

import { prismaExclude } from '~/lib/prisma';

import { AllServicesQueryOptions } from '~/services/TypesOfCleaningService';

export async function executeDatabaseOperation<T>(
  transaction: Promise<T>,
  onErrorCallback?: (err?: unknown) => void
) {
  let result: T | null = null;
  try {
    result = await transaction;
  } catch (err) {
    console.error(err);
    onErrorCallback?.(err);
  }

  return result;
}

export const includeWithOtherDataIfTrue = (
  name: string,
  optionToInclude: string,
  option: boolean | undefined,
  filters?: Record<string, unknown>
) => {
  const filterQuery = filters ? { select: filters } : true;

  return option
    ? {
        [name]: {
          include: {
            [optionToInclude]: filterQuery
          }
        }
      }
    : undefined;
};

export const includeIfTrue = (name: string, option: boolean | undefined) =>
  option
    ? {
        [name]: {
          include: true
        }
      }
    : undefined;
