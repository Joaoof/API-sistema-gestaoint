/* eslint-disable no-unused-vars */

import { Seller } from '../../entities/sales/seller.entity';

export interface SellerRepository {
  create(input: { name: string; email: string }): Promise<Seller>;
  findById(id: string): Promise<Seller | null>;
  findAll(): Promise<Seller[]>;
  addPerformance(input: {
    sellerId: string;
    commissionToAdd: number;
    pointsToAdd: number;
  }): Promise<void>;
}
