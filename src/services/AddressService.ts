import type { Address } from '@prisma/client';
import { krakowPostcodes } from '~/fixtures/krakowPostcodes';

export default class AddressService {
  public async validatePostcode(data: Omit<Address, 'id'>) {
    return krakowPostcodes.includes(data.postCode);
  }
}
