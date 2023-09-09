import { User } from '@prisma/client';

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
}
