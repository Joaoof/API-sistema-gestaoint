// src/infra/database/implementations/product.prisma.repository.ts
import { Product } from '../../../../core/entities/product.entity';
import { ProductsRepository } from '../../../../core/ports/product.repository';
import { PrismaService } from '../../../../../prisma/prisma.service';

export class PrismaProductsRepository implements ProductsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(product: Product): Promise<void> {
        await this.prisma.product.create({ data: product });
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