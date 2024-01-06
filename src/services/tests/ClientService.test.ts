import { Frequency, Status } from '@prisma/client';
import { describe, expect, test, vi } from 'vitest';

import prisma from '~/lib/__mocks__/prisma';

import ClientService from '../ClientService';

vi.mock('~/lib/prisma');

describe('ClientService', () => {
  const clientService = new ClientService();

  describe('getClientReservations', () => {
    test('should parse client reservation data properly if found', async () => {
      const mockResultQuery = {
        reservations: [
          {
            name: 'TestReservation',
            status: Status.ACTIVE,
            id: 1,
            bookerEmail: 'test@xyz.com',
            bookerFirstName: 'John',
            bookerLastName: 'Doe',
            frequency: Frequency.ONCE,
            address: {
              city: 'City',
              street: 'Street',
              houseNumber: '1',
              postCode: '00-000'
            },
            visits: [
              {
                detergentsCost: 10,
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
                description: 'Description',
                detergentsCost: 10
              }
            ]
          }
        ]
      };

      prisma.client.findUnique.mockResolvedValue(mockResultQuery);

      const clientId = 1;
      const status = 'ACTIVE';

      const reservationData = await clientService.getClientReservations(
        clientId,
        status
      );

      expect(reservationData).toStrictEqual(mockResultQuery);
    });
  });
});
