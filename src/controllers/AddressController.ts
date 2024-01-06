import type { Request, Response } from 'express';

import { validateAddress } from '~/middlewares/type-validators/address';

import { AddressService } from '~/services';

import type { TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class AddressController extends AbstractController {
  private addressService: AddressService;

  constructor() {
    super('/addresses');
    this.addressService = new AddressService();
    this.createRouters();
  }

  public createRouters() {
    this.router.post('/check', validateAddress(), this.getAddress);
  }

  private getAddress = async (req: Request, res: Response) => {
    const address = this.addressService.validatePostcode(req.body);

    console.log('address', address);

    if (address) {
      res.status(200).send(address);
    } else {
      res.status(404).send({ message: 'Invalid post code' });
    }
  };
}
