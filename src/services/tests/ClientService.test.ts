import { Prisma } from '@prisma/client';
import { describe, expect, test, vi } from 'vitest';

import prisma from '~/lib/__mocks__/prisma';

import ClientService from '../ClientService';

vi.mock('~/lib/prisma');

describe('ClientService', () => {
  const clientService = new ClientService();

  test('getClientReservations', async () => {
    const mockResultQuery = {
      reservations: [
        {
          address: {
            city: 'City',
            street: 'Street',
            houseNumber: '1',
            apartmentNumber: '1',
            postalCode: '00-000'
          },
          visits: [
            {
              visitParts: [
                {
                  id: 1,
                  startDate: new Date('2021-01-01T12:00:00.000Z'),
                  endDate: new Date('2021-01-01T13:00:00.000Z'),
                  employeeId: 1,
                  status: 'ACTIVE'
                }
              ]
            }
          ],
          services: [
            {
              id: 1,
              name: 'Service',
              price: 100,
              duration: 60,
              description: 'Description'
            }
          ]
        }
      ]
    };

    prisma.client.findUnique.mockResolvedValue(mockResultQuery);

    const clientId = 1;
    const status = 'ACTIVE';

    const clientData = await clientService.getClientReservations(
      clientId,
      status
    );

    expect(clientData).toEqual({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@xyz.com'
    });
  });
});
