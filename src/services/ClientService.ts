import { Address, Client, Status } from '@prisma/client';
import { SetOptional } from 'type-fest';

import { prisma } from '~/db';

import { prismaExclude } from '~/lib/prisma';

import { RegisterData } from '~/schemas/auth';
import { UserUpdateData } from '~/schemas/common';

import { serviceInclude, visitPartWithEmployee } from '~/queries/serviceQuery';

import {
  flattenNestedReservationServices,
  flattenNestedVisits
} from '~/utils/visits';

import { executeDatabaseOperation } from '../utils/queryUtils';

export default class ClientService {
  public async createClient(data: SetOptional<RegisterData, 'password'>) {
    {
      return await executeDatabaseOperation(
        prisma.client.upsert({
          where: { email: data.email },
          update: {
            ...data
          },
          create: {
            ...data
          }
        })
      );
    }
  }

  public async getClientByEmail(email: Client['email']) {
    let user: Client | null = null;

    try {
      user = await prisma.client.findUnique({
        where: { email }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return user;
  }

  public async getClientById(id: Client['id']) {
    let user: Client | null = null;

    try {
      user = await prisma.client.findUnique({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return user;
  }

  public async getAllClients() {
    let users: Client[] | null = null;

    try {
      users = await prisma.client.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return users;
  }

  public async getClientReservations(clientId: Client['id'], status?: Status) {
    const clientData = await executeDatabaseOperation(
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          reservations: {
            where: {
              status
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
      })
    );
    return (
      clientData?.reservations.map((reservation) => ({
        ...reservation,
        visits: flattenNestedVisits(reservation.visits),
        services: flattenNestedReservationServices(reservation.services)
      })) ?? null
    );
  }

  public async getClientAddresses(clientId: Client['id']) {
    let addresses: Address[] | null = null;

    try {
      const userWithVisits = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          reservations: {
            include: {
              address: true
            }
          }
        }
      });

      addresses =
        userWithVisits?.reservations.flatMap((group) => group.address) ?? null;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return addresses;
  }

  public async changeClientData(
    clientId: Client['id'],
    userData: UserUpdateData
  ) {
    return await executeDatabaseOperation(
      prisma.client.update({
        where: { id: clientId },
        data: {
          ...userData
        },
        select: {
          ...prismaExclude('Client', ['password'])
        }
      })
    );
  }
}
