import {
  ReservationStatus,
  type RecurringReservation,
  type Address,
  Reservation,
  CleaningFrequency
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import type { RequireExactlyOne } from 'type-fest';

import { prisma } from '~/db';

export default class AddressService {
  public async createAddress(data: Omit<Address, 'id'>) {
    let address: Address | null = null;

    try {
      address = await prisma.address.create({
        data
      });
    } catch (err) {
      console.error(err);
    }

    return address;
  }
}
