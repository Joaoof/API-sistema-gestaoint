// src/infra/database/implementations/product.prisma.repository.ts
import { Product } from '../../../../core/entities/product.entity';
import { ProductsRepository } from '../../../../core/ports/product.repository';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaProductsRepository implements ProductsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(product: Product, userId: string): Promise<Product> {
        const createdProduct = await this.prisma.product.create({
            data: {
                id: product.id,
                nameProduct: product.nameProduct ?? '',
                quantity: product.quantity ?? '',
                costPrice: product.costPrice ?? '',
                salePrice: product.salePrice ?? '',
                description: product.description,
                categoryId: product.categoryId ?? '', // aqui você liga o produto à categoria
                supplierId: product.supplierId ?? '', // mesma ideia para fornecedor
                createdById: userId ?? '',
                createdAt: product.createdAt ?? '',
                updatedAt: product.updatedAt ?? '',
            },
        });

        return Product.fromPrisma(createdProduct);

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