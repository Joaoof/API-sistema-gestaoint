// src/core/ports/product.repository.ts
import { Product } from '../entities/product.entity';

export interface ProductsRepository {
    create(product: Product): Promise<void>;
    findById(id: string): Promise<Product | null>;
    findAll(): Promise<Product[]>;
}