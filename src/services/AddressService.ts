import type { Address } from '@prisma/client';
import { krakowPostcodes } from '~/fixtures/krakowPostcodes';

export default class AddressService {
  public validatePostcode(data: Omit<Address, 'id'>) {
    return krakowPostcodes.includes(data.postCode) ? data : null;
  }
}
