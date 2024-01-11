import { Status } from '@prisma/client';

import prisma from '~/lib/prisma';

import { Scheduler } from '~/utils/Scheduler';
import { isAfter, isAfterOrSame } from '~/utils/dateUtils';

export async function scheduleAndCloseVisitParts() {
  const scheduler = Scheduler.getInstance();

  if (!scheduler) {
    return;
  }

  return await prisma.$transaction(async (tx) => {
    const allActiveVisitParts = await tx.visitPart.findMany({
      where: { status: Status.ACTIVE }
    });

    const pastVisitParts = allActiveVisitParts.filter((visitPart) =>
      isAfterOrSame(new Date(), visitPart.endDate)
    );

    if (pastVisitParts.length > 0) {
      await prisma.visitPart.updateMany({
        where: { id: { in: pastVisitParts.map(({ id }) => id) } },
        data: {
          status: Status.CLOSED
        }
      });
    }

    const futureVisitParts = allActiveVisitParts.filter((visitPart) =>
      isAfter(visitPart.endDate, new Date())
    );

    futureVisitParts.forEach(async (visitPart) => {
      scheduler.scheduleJob(
        `${visitPart.id}`,
        visitPart.endDate,
        async () =>
          await prisma.visitPart.updateMany({
            where: { id: { in: pastVisitParts.map(({ id }) => id) } },
            data: {
              status: Status.CLOSED
            }
          })
      );
    });
  });
}
