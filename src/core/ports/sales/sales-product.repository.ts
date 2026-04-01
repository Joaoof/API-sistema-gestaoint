/* eslint-disable no-unused-vars */

import { SalesProduct } from '../../entities/sales/sales-product.entity';

export interface SalesProductRepository {
  create(input: {
    name: string;
    sku: string;
    unitPrice: number;
  }): Promise<SalesProduct>;
  findById(id: string): Promise<SalesProduct | null>;
  findManyByIds(ids: string[]): Promise<SalesProduct[]>;
  findAll(): Promise<SalesProduct[]>;
}
