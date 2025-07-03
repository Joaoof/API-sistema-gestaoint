// src/infra/database/implementations/product.prisma.repository.ts
import { Product } from '../../../../core/entities/product.entity';
import { ProductsRepository } from '../../../../core/ports/product.repository';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaProductsRepository implements ProductsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(product: Product): Promise<void> {
        await this.prisma.product.create({
            data: {
                id: product.id,
                nameProduct: product.name,
                quantity: product.quantity,
                costPrice: product.costPrice,
                salePrice: product.salerPrice,
                description: product.description,
                categoryId: product.categoryId, // aqui você liga o produto à categoria
                supplierId: product.supplierId, // mesma ideia para fornecedor
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
            },
        });
    }

    async findById(id: string): Promise<Product | null> {
        const data = await this.prisma.product.findUnique({ where: { id } });
        return data ? Product.fromPrisma(data) : null;
    }

    async findAll(): Promise<Product[]> {
        const data = await this.prisma.product.findMany();
        return data.map(Product.fromPrisma);
    }
}