// src/modules/product/mappers/product.mapper.ts
import { z } from 'zod';
import { Product } from 'src/core/entities/product.entity';
import { CreateProductDto, CreateProductSchema } from '../dtos/create-product.dto';

export class ProductMapper {
    /**
     * Converte um DTO para uma entidade de domínio
     */
    static toDomain(dto: CreateProductDto): Product {
        return new Product(
            crypto.randomUUID(), // ou receba de um ID gerado externamente
            dto.name,
            dto.categoryName ?? null,
            dto.quantity ?? 0,
            dto.costPrice,
            dto.salePrice,
            dto.supplierName ?? null,
            dto.description ?? null,
            dto.createdAt ?? new Date(),
            dto.updatedAt ?? new Date()
        );
    }

    /**
     * Converte dados do Prisma para a entidade de domínio
     */
    static toDomainFromPrisma(data: any): Product {
        return new Product(
            data.id,
            data.nameProduct, // Ajuste para o novo campo nameProduct
            data.categoryName ?? null,
            data.quantity ?? 0,
            data.costPrice.toNumber(),
            data.salePrice.toNumber(),
            data.supplierName ?? null,
            data.description ?? null,
            data.createdAt,
            data.updatedAt
        );
    }

    /**
     * Converte a entidade para um objeto serializável (para resposta JSON)
     */
    static toJSON(product: Product): any {
        return {
            id: product.id,
            nameProduct: product.nameProduct,
            description: product.description,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            categoryName: product.categoryName,
            supplierName: product.supplierName,
            createdAt: product.createdAt.toISOString(),
        };
    }

    /**
     * Valida e converte um payload bruto usando Zod
     */
    static validateAndParse(input: any): z.infer<typeof CreateProductSchema> {
        return CreateProductSchema.parse(input);
    }
}