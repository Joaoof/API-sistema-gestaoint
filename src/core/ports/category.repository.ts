// src/core/ports/product.repository.ts
import { Category } from '../entities/category.entity';

export interface CategoriesRepository {
    create(product: Category): Promise<void>;
    findById(id: string): Promise<Category | null>;
    findActiveCategories()
    findAll(): Promise<Category[]>;
}