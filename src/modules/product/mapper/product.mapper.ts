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
            dto.name,
            dto.description ?? '',
            dto.price.toString(),
            Number(dto.categoryId),
            dto.supplierId,
            new Date().toISOString()
        );
    }

    /**
     * Converte dados do Prisma para a entidade de domínio
     */
    static toDomainFromPrisma(data: any): Product {
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

    /**
     * Converte a entidade para um objeto serializável (para resposta JSON)
     */
    static toJSON(product: Product): any {
        return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            categoryId: product.categoryId,
            supplierId: product.supplierId,
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