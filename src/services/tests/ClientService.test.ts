import { describe, expect, test, vi } from 'vitest';

import prisma from '~/lib/__mocks__/prisma';

import ClientService from '../ClientService';

vi.mock('~/lib/prisma');

describe('ClientService', () => {
  const clientService = new ClientService();

  test('should return user by its id if provided', async () => {
    prisma.client.findUnique.mockResolvedValue({
      id: 1,
      firstName: null,
      lastName: null,
      email: 'test@xyz.com',
      password: expect.any(String),
      phone: null
    });

    const client = await clientService.getClientById(1);

    expect(client).toStrictEqual({
      id: 1,
      firstName: null,
      lastName: null,
      email: 'test@xyz.com',
      password: expect.any(String),
      phone: null
    });
  });

  test('should create anonymous user', async () => {
    prisma.client.upsert.mockResolvedValue({
      id: 4,
      firstName: null,
      lastName: null,
      email: 'test@mail.com',
      password: null,
      phone: null
    });

    const client = await clientService.createClient({
      email: 'test@mail.com'
    });

    expect(client).toStrictEqual({
      id: 4,
      firstName: null,
      lastName: null,
      email: 'test@mail.com',
      password: null,
      phone: null
    });
  });
});
