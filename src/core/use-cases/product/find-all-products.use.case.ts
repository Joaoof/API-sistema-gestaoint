// src/core/use-cases/product/find-all-products.use-case.ts
import { Product } from "src/core/entities/product.entity";
import { ProductsRepository } from "src/core/ports/product.repository";

export class FindAllProductsUseCase {
    constructor(private readonly productsRepository: ProductsRepository) { }

    async execute(): Promise<Product[]> {
        return this.productsRepository.findAll();
    }
}