// src/core/entities/product.entity.ts
import { Prisma } from '@prisma/client';

export class Product {
    constructor(
        public readonly id: string,
        public name: string,
        public description: string | null,
        public price: number,
        public categoryId: string,
        public supplierId: string,
        public readonly createdAt: Date = new Date()
    ) { }

    static fromPrisma(data: Prisma.ProductGetPayload<{}>): Product {
        return new Product(
            data.id,
            data.name,
            data.description,
            data.price.toNumber(),
            data.categoryId,
            data.supplierId,
            data.createdAt
        );
    }
}