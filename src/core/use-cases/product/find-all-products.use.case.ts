// src/core/use-cases/product/find-all-products.use-case.ts
import { Inject, Injectable } from "@nestjs/common";
import { Product } from "src/core/entities/product.entity";
import { ProductsRepository } from "src/core/ports/product.repository";

@Injectable()
export class FindAllProductsUseCase {
    constructor(@Inject('ProductsRepository') private readonly productsRepository: ProductsRepository) { }

    async execute(): Promise<Product[]> {
        return this.productsRepository.findAll();
    }
}