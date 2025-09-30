/* eslint-disable no-unused-vars */
import { Category } from 'src/core/entities/category.entity';

export interface CategoriesRepository {
  create(category: Category): Promise<void>;

  findById(id: string): Promise<Category | null>;

  findActiveCategories(): Promise<Category[]>;

  findAll(): Promise<Category[]>;
}
