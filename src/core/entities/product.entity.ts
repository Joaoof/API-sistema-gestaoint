import { Prisma } from '@prisma/client';
import { DomainValidationError } from '../exceptions/domain.exception';

type ValidationError = { field: string; message: string };

export class Product {
    constructor(
        public readonly id: string,
        public nameProduct: string,
        public quantity: number,
        public costPrice: number,
        public salePrice: number,
        public readonly categoryId: string,
        public readonly supplierId: string,
        public readonly createdById: string,
        public description: string | null = null,
        public readonly createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) {
        this.validate();
    }

    private validate(): void {
        const errors: ValidationError[] = [];

        if (!this.id) {
            errors.push({ field: 'id', message: 'ID do produto é obrigatório.' });
        }

        if (!this.nameProduct || this.nameProduct.trim().length === 0) {
            errors.push({ field: 'name', message: 'Nome do produto é obrigatório.' });
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

        if (!this.categoryId) {
            errors.push({ field: 'categoryId', message: 'Categoria é obrigatória.' });
        }

        if (!this.supplierId) {
            errors.push({ field: 'supplierId', message: 'Fornecedor é obrigatório.' });
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

    update(
        name: string,
        description: string | null,
        quantity: number,
        categoryId: string,
        supplierId: string
    ): void {
        this.nameProduct = name;
        this.description = description;
        this.quantity = quantity;
        this.updatedAt = new Date();
        (this as any).categoryId = categoryId;
        (this as any).supplierId = supplierId;
        this.validate();
    }

    static toJSON(product: Product) {
        return {
            nameProduct: product.nameProduct || 'NOME NÃO DEFINIDO', // tenta os dois
            quantity: product.quantity,
            costPrice: product.costPrice,
            salePrice: product.salePrice,  // corrige esse 'salePrice' que tá meio estranho (seria 'salePrice'?)
            categoryId: product.categoryId ?? '',
            supplierId: product.supplierId ?? '',
            description: product.description ?? '',
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
        };
    }


    static fromPrisma(data: Prisma.ProductGetPayload<{
        include?: { category?: true, supplier?: true }
    }>): Product {
        return new Product(
            data.id,
            data.nameProduct,
            data.quantity ?? 0,
            data.costPrice.toNumber(),
            data.salePrice.toNumber(),
            data.categoryId ?? '',      // evita undefined, usa string vazia ou null se seu construtor aceitar
            data.supplierId ?? '',
            data.createdById ?? '',    // se for opcional, usa null
            data.description ?? null,
            data.createdAt,
            data.updatedAt,
        );
    }

}
