// src/core/use-cases/product/find-all-products.use-case.ts
import { Inject, Injectable } from "@nestjs/common";
import { Category } from "src/core/entities/category.entity";
import { CategoriesRepository } from "src/core/ports/category.repository";

@Injectable()
export class FindActiveCategoriesUseCase {
    constructor(@Inject('CategoriesRepository') private readonly categoriesRepository: CategoriesRepository) { }


    async execute(): Promise<Category[]> {
        const activeCategories = await this.categoriesRepository.findActiveCategories();
        return activeCategories;
    }
}