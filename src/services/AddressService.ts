import type { Address } from '@prisma/client';
import { RequireAtLeastOne } from 'type-fest';

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

  public async getAllAddresses() {
    let addresses: Address[] | null = null;

    try {
      addresses = await prisma.address.findMany();
    } catch (err) {
      console.error(err);
    }

    return addresses;
  }

  public async getAddressById(id: Address['id']) {
    let address: Address | null = null;

    try {
      address = await prisma.address.findUnique({
        where: { id }
      });
    } catch (err) {
      console.error(err);
    }

    return address;
  }

  public async changeAddressData(data: RequireAtLeastOne<Address, 'id'>) {
    let address: Address | null = null;

    const { id, ...rest } = data;
    try {
      address = await prisma.address.update({
        where: { id },
        data: { ...rest }
      });
    } catch (err) {
      console.error(err);
    }

    return address;
  }

  public async deleteAddressData(id: Address['id']) {
    let address: Address | null = null;

    try {
      address = await prisma.address.delete({
        where: { id }
      });
    } catch (err) {
      console.error(err);
    }

    return address;
  }
}
