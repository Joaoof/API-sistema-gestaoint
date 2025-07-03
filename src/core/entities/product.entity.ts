// src/core/entities/product.entity.ts
import { Prisma } from '@prisma/client';
import { DomainValidationError } from '../exceptions/domain.exception';

export class Product {
    constructor(
        public readonly id: string,
        public nameProduct: string,
        public categoryName: string | null,
        public quantity: number,
        public costPrice: number,
        public salePrice: number,
        public supplierName: string | null,
        public description: string | null,
        public readonly createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) {
        this.validate();
    }

    private validate(): void {
        const errors: { field: string; message: string }[] = [];

        if (!this.id) {
            errors.push({ field: 'id', message: 'ID do produto é obrigatório.' });
        }

        if (!this.nameProduct || this.nameProduct.trim().length === 0) {
            errors.push({ field: 'nameProduct', message: 'Nome do produto é obrigatório.' });
        }

        if (!this.categoryName) {
            errors.push({ field: 'categoryName', message: 'Categoria é obrigatória.' });
        }

        if (this.quantity < 0) {
            errors.push({ field: 'quantity', message: 'Quantidade não pode ser negativa.' });
        }

        if (this.costPrice < 0) {
            errors.push({ field: 'costPrice', message: 'Preço de custo não pode ser negativo.' });
        }

        if (this.salePrice < 0) {
            errors.push({ field: 'salePrice', message: 'Preço de venda não pode ser negativo.' });
        }

        if (!this.supplierName) {
            errors.push({ field: 'supplierName', message: 'Fornecedor é obrigatório.' });
        }

        if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
            errors.push({ field: 'createdAt', message: 'Data de criação inválida.' });
        }

        if (!(this.updatedAt instanceof Date) || isNaN(this.updatedAt.getTime())) {
            errors.push({ field: 'updatedAt', message: 'Data de atualização inválida.' });
        }

        if (errors.length > 0) {
            throw new DomainValidationError(errors);
        }
    }


    update(nameProduct, description, quantity, categoryName, supplierName): void {
        this.nameProduct = nameProduct;
        this.description = description;
        this.quantity = quantity;
        this.categoryName = categoryName;
        this.supplierName = supplierName;
        this.updatedAt = new Date();

        this.validate();
    }

    toJSON() {
        return {
            id: this.id,
            nameProduct: this.nameProduct,
            description: this.description,
            costPrice: this.costPrice,
            salePrice: this.salePrice,
            categoryName: this.categoryName,
            supplierName: this.supplierName,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    static fromPrisma(data: Prisma.ProductGetPayload<{}>): Product {
        return new Product(
            data.id,
            data.nameProduct,
            data.categoryName ?? null,
            data.quantity ?? 0,
            data.costPrice.toNumber(),
            data.salerPrice.toNumber(),
            data.supplierName ?? null,
            data.description ?? null,
            data.createdAt,
            data.updatedAt,
        );
    }
}