import { Status } from '@prisma/client';

import prisma from '~/lib/prisma';

import { serviceInclude, visitPartWithEmployee } from '~/queries/serviceQuery';

import { Scheduler } from '~/utils/Scheduler';
import { isAfter, isAfterOrSame } from '~/utils/dateUtils';
import {
  flattenNestedReservationServices,
  flattenNestedVisits
} from '~/utils/visits';

export async function scheduleAndCloseVisitParts() {
  const scheduler = Scheduler.getInstance();

  if (!scheduler) {
    return;
  }

  return await prisma.$transaction(async (tx) => {
    const allActiveReservations = await tx.reservation.findMany({
      where: { status: Status.ACTIVE },
      include: {
        visits: {
          include: {
            visitParts: visitPartWithEmployee
          }
        },
        services: serviceInclude
      }
    });

    const allActiveReservationsData = allActiveReservations.map(
      (reservation) => ({
        ...reservation,
        visits: flattenNestedVisits(reservation.visits),
        services: flattenNestedReservationServices(reservation.services)
      })
    );

    const reservationVisitParts = await prisma.visitPart.findMany({
      where: {
        visit: {
          reservationId: { in: allActiveReservations.map(({ id }) => id) }
        },
        status: Status.ACTIVE
      },
      orderBy: { startDate: 'asc' }
    });

    if (!reservationVisitParts || reservationVisitParts.length === 0) {
      return;
    }

    const pastVisitParts = reservationVisitParts.filter((visitPart) =>
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

    const futureVisitParts = reservationVisitParts.filter((visitPart) =>
      isAfter(visitPart.endDate, new Date())
    );

    futureVisitParts.forEach(async (visitPart) => {
      scheduler.scheduleVisitPartJob(visitPart, () =>
        prisma.visitPart.updateMany({
          where: { id: { in: pastVisitParts.map(({ id }) => id) } },
          data: {
            status: Status.CLOSED
          }
        })
      );
    });

    // close past reservations if there are any
    const pastReservations = allActiveReservationsData.filter((reservation) => {
      const reservationEndDate = Math.max(
        ...reservation.visits
          .flatMap((visit) => visit.visitParts)
          .map((visitPart) => new Date(visitPart.endDate).getTime())
      );

      return isAfterOrSame(new Date(), new Date(reservationEndDate));
    });

    if (pastReservations.length > 0) {
      await tx.reservation.updateMany({
        where: { id: { in: pastReservations.map(({ id }) => id) } },
        data: {
          status: Status.CLOSED
        }
      });
    }

    const futureReservations = allActiveReservationsData.filter(
      (reservation) => {
        const reservationEndDate = Math.max(
          ...reservation.visits
            .flatMap((visit) => visit.visitParts)
            .map((visitPart) => new Date(visitPart.endDate).getTime())
        );

        return isAfter(new Date(reservationEndDate), new Date());
      }
    );

    futureReservations?.forEach(async (reservation) => {
      const reservationEndDate =
        reservationVisitParts[reservationVisitParts.length - 1]!.endDate;

      scheduler.scheduleReservationJob(
        reservation.id,
        new Date(reservationEndDate),
        () =>
          tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: Status.CLOSED
            }
          })
      );
    });
  });
}
