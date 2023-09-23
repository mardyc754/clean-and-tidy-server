import type { Reservation, Address, User } from '@prisma/client';
import type { RequireAtLeastOne } from 'type-fest';

import { prisma } from '~/db';

export default class UserService {
  public async createUser(
    username: User['username'],
    email: User['email'],
    password: User['password']
  ) {
    let user: User | null = null;

    try {
      user = await prisma.user.create({
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

  public async getUserByUsername(username: User['username']) {
    let user: User | null = null;

    try {
      user = await prisma.user.findFirst({
        where: { username }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return user;
  }

  public async getUserById(id: User['id']) {
    let user: User | null = null;

    try {
      user = await prisma.user.findFirst({
        where: { id }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return user;
  }

  public async getAllUsers() {
    let users: User[] | null = null;

    try {
      users = await prisma.user.findMany();
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return users;
  }

  public async getUserReservations(userId: User['id']) {
    let reservations: Reservation[] | null = null;

    try {
      const userWithReservations = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          recurringReservations: {
            include: {
              reservations: true
            }
          }
        }
      });

      reservations =
        userWithReservations?.recurringReservations.flatMap(
          (group) => group.reservations
        ) ?? [];
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return reservations;
  }

  public async getUserAddresses(userId: User['id']) {
    let addresses: Address[] | null = null;

    try {
      const userWithReservations = await prisma.user.findUnique({
        where: { id: userId },
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
        ) ?? [];
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }
    return addresses;
  }

  public async changeUserData(userData: RequireAtLeastOne<User, 'id'>) {
    const { id, ...rest } = userData;
    let newUserData: User | null = null;

    try {
      newUserData = await prisma.user.update({
        where: { id },
        data: {
          ...rest
        }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return newUserData;
  }

  public async deleteUser(userId: User['id']) {
    let deleteUser: User | null = null;

    try {
      deleteUser = await prisma.user.delete({
        where: { id: userId }
      });
    } catch (err) {
      console.error(`Something went wrong: ${err}`);
    }

    return deleteUser;
  }
}
