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
    this.router.get('/', this.getAllAddresses);
    this.router.get('/:id', this.getAddressById);
    this.router.post('/check', validateAddress(), this.getAddress);
  }

  private getAllAddresses = async (_: Request, res: Response) => {
    const addresses = await this.addressService.getAllAddresses();

    if (addresses) {
      res.status(200).send(addresses);
    } else {
      res.status(400).send({ message: 'Error when receiving all addresses' });
    }
  };

  private getAddressById = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const address = await this.addressService.getAddressById(
      parseInt(req.params.id)
    );

    if (address) {
      res.status(200).send(address);
    } else {
      res
        .status(404)
        .send({ message: `Address with id=${req.params.id} does not exist` });
    }
  };

  private getAddress = async (req: Request, res: Response) => {
    const address = await this.addressService.getAddress(req.body);

    if (address) {
      res.status(200).send(address);
    } else {
      res.status(404).send({ message: 'Given address does not exist' });
    }
  };
}
