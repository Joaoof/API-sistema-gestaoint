/* eslint-disable no-unused-vars */

import { Sale } from '../../entities/sales/sale.entity';

export interface SaleRepository {
  create(input: {
    sellerId: string;
    totalAmount: number;
    commissionAmount: number;
    pointsEarned: number;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }): Promise<Sale>;
  findAll(): Promise<Sale[]>;
}
