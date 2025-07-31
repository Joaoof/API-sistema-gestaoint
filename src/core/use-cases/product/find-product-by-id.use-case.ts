// src/core/use-cases/product/find-product-by-id.use-case.ts
import { Product } from "src/core/entities/product.entity";
import { NotFoundError } from "src/core/exceptions/api.exception";
import { ProductsRepository } from "src/core/ports/product.repository";

export class FindProductByIdUseCase {
    constructor(private readonly productsRepository: ProductsRepository) { }

    async execute(id: string): Promise<Product> {
        const product = await this.productsRepository.findById(id);
        if (!product) {
            throw new NotFoundError(`Product with not found`, id);
        }
        return product;
    }
}