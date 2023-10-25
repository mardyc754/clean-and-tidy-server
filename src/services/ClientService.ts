import {
  Reservation,
  Address,
  Client,
  ReservationStatus
} from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

export default class ClientService {
  public async createClient(
    username: Client['username'],
    email: Client['email'],
    password: Client['password']
  ) {
    let user: Client | null = null;

    try {
      user = await prisma.client.create({
        data: {
          email,
          username,
          password
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return user;
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

  public async getClientReservations(
    clientId: Client['id'],
    status?: ReservationStatus
  ) {
    let reservations: Reservation[] | null = null;

    const reservationStatusFilter = status ? { where: { status } } : true;

    // let userWithReservations;
    try {
      const userWithReservations = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          recurringReservations: {
            include: {
              reservations: reservationStatusFilter
            }
          }
        }
      });

      reservations =
        userWithReservations?.recurringReservations.flatMap(
          (group) => group.reservations
        ) ?? null;
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return reservations;
    // return userWithReservations;
  }

  public async getClientAddresses(clientId: Client['id']) {
    let addresses: Address[] | null = null;

    try {
      const userWithReservations = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          recurringReservations: {
            include: {
              address: true
            }
          }
        }
      });

      addresses =
        userWithReservations?.recurringReservations.flatMap(
          (group) => group.address
        ) ?? null;
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

    const userActiveReservations = await this.getClientReservations(
      clientId,
      ReservationStatus.ACTIVE
    );

    if (!userActiveReservations || userActiveReservations.length === 0) {
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
