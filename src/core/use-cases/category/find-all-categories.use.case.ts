// src/core/use-cases/product/find-all-products.use-case.ts
import { Inject, Injectable } from "@nestjs/common";
import { Category } from "src/core/entities/category.entity";
import { CategoriesRepository } from "src/core/ports/category.repository";

@Injectable()
export class FindAllCategoriesUseCase {
    constructor(@Inject('CategoriesRepository') private readonly categoriesRepository: CategoriesRepository) {
        console.log('categoriesRepository:', categoriesRepository); // Deve mostrar o objeto

    }


    async execute(): Promise<Category[]> {
        const findAll = await this.categoriesRepository.findAll();
        return findAll;
    }
}