/* eslint-disable no-unused-vars */

import { Product } from '../entities/product.entity';

export interface ProductsRepository {
  create(product: Product, userId: string): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
}
