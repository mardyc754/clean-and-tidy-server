import type { Address } from '@prisma/client';

import prisma from '~/lib/prisma';

export default class AddressService {
  public async getAddress(data: Omit<Address, 'id'>) {
    return await prisma.address.findFirst({
      where: { ...data }
    });
  }
}
