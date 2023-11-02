import { Visit, Address, Client, Status } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

import { executeDatabaseOperation } from './utils';

type ClientCreationData = Pick<Client, 'email'> & {
  username?: Client['username'];
  password?: Client['password'];
};

export default class ClientService {
  public async createClient(data: ClientCreationData) {
    {
      return await executeDatabaseOperation(
        prisma.client.create({
          data
        })
      );
    }
  }

  public async getClientByUsername(username: Client['username']) {
    if (!username) return null;
    let user: Client | null = null;

    try {
      user = await prisma.client.findUnique({
        where: { username }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return user;
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

  public async getClientVisits(clientId: Client['id'], status?: Status) {
    let visits: Visit[] | null = null;

    const reservationStatusFilter = status ? { where: { status } } : true;

    // let userWithVisits;
    try {
      const userWithVisits = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          reservations: {
            include: {
              visits: reservationStatusFilter
            }
          }
        }
      });

      visits =
        userWithVisits?.reservations.flatMap((group) => group.visits) ?? null;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return visits;
    // return userWithVisits;
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
    userData: Pick<Client, 'id'> &
      RequireAtLeastOne<Client, 'firstName' | 'lastName' | 'phone'>
  ) {
    const { id, ...rest } = userData;
    let newClientData: Client | null = null;

    try {
      newClientData = await prisma.client.update({
        where: { id },
        data: {
          ...rest
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return newClientData;
  }

  // delete user - user can be deleted only when one does not have any active reservations
  public async deleteClient(clientId: Client['id']) {
    let deleteClient: Client | null = null;

    const userActiveVisits = await this.getClientVisits(
      clientId,
      Status.ACTIVE
    );

    if (!userActiveVisits || userActiveVisits.length === 0) {
      try {
        deleteClient = await prisma.client.delete({
          where: { id: clientId }
        });
      } catch (err) {
        console.error(`Something went wrong: ${err}`);
      }
    }

    return deleteClient;
  }
}
