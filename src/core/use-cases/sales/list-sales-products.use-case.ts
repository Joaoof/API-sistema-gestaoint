/* eslint-disable no-unused-vars */

import { Inject, Injectable } from '@nestjs/common';
import { SalesProduct } from '../../entities/sales/sales-product.entity';
import { SalesProductRepository } from '../../ports/sales/sales-product.repository';

@Injectable()
export class ListSalesProductsUseCase {
  constructor(
    @Inject('SalesProductRepository')
    private readonly salesProductRepository: SalesProductRepository,
  ) {}

  execute(): Promise<SalesProduct[]> {
    return this.salesProductRepository.findAll();
  }
}
