/* eslint-disable no-unused-vars */

import { Inject, Injectable } from '@nestjs/common';
import { Sale } from '../../entities/sales/sale.entity';
import { SaleRepository } from '../../ports/sales/sale.repository';

@Injectable()
export class ListSalesUseCase {
  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: SaleRepository,
  ) {}

  execute(): Promise<Sale[]> {
    return this.saleRepository.findAll();
  }
}
