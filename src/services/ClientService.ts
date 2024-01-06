import { Client, Status } from '@prisma/client';
import { SetOptional } from 'type-fest';

import prisma from '~/lib/prisma';
import { prismaExclude } from '~/lib/prismaExclude';

import { RegisterData } from '~/schemas/auth';
import { UserUpdateData } from '~/schemas/common';

import {
  reservationWithGivenStatuses,
  serviceInclude,
  visitPartWithEmployee
} from '~/queries/serviceQuery';

import {
  flattenNestedReservationServices,
  flattenNestedVisits
} from '~/utils/visits';

export default class ClientService {
  public async createClient(data: SetOptional<RegisterData, 'password'>) {
    {
      return await prisma.client.upsert({
        where: { email: data.email },
        update: {
          ...data
        },
        create: {
          ...data
        }
      });
    }
  }

  public async getClientByEmail(email: Client['email']) {
    return await prisma.client.findUnique({
      where: { email }
    });
  }

  public async getClientById(id: Client['id']) {
    return await prisma.client.findUnique({
      where: { id }
    });
  }

  public async getAllClients() {
    return await prisma.client.findMany();
  }

  public async getClientReservations(clientId: Client['id'], status?: Status) {
    const clientData = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        reservations: {
          where: {
            ...reservationWithGivenStatuses(status ? [status] : [])
          },
          include: {
            visits: {
              include: {
                visitParts: visitPartWithEmployee
              }
            },
            services: serviceInclude,
            address: true
          }
        }
      }
    });

    return (
      clientData?.reservations.map((reservation) => ({
        ...reservation,
        visits: flattenNestedVisits(reservation.visits),
        services: flattenNestedReservationServices(reservation.services)
      })) ?? null
    );
  }

  public async changeClientData(
    clientId: Client['id'],
    userData: UserUpdateData
  ) {
    return await prisma.client.update({
      where: { id: clientId },
      data: {
        ...userData
      },
      select: {
        ...prismaExclude('Client', ['password'])
      }
    });
  }
}
