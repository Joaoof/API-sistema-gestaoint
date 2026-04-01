/* eslint-disable no-unused-vars */

import { Inject, Injectable } from '@nestjs/common';
import { Seller } from '../../entities/sales/seller.entity';
import { SellerRepository } from '../../ports/sales/seller.repository';

@Injectable()
export class ListSellersUseCase {
  constructor(
    @Inject('SellerRepository')
    private readonly sellerRepository: SellerRepository,
  ) {}

  execute(): Promise<Seller[]> {
    return this.sellerRepository.findAll();
  }
}
