// src/infra/database/implementations/product.prisma.repository.ts
import { Category } from '../../../../core/entities/category.entity';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CategoriesRepository } from 'src/core/ports/category.repository';

export class PrismaCategoriesRepository implements CategoriesRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(category: Category): Promise<void> {
        await this.prisma.category.create({ data: category });
    }

    async findById(id: string): Promise<Category | null> {
        const data = await this.prisma.category.findUnique({ where: { id } });
        return data ? Category.fromPrisma(data) : null;
    }

    async findAll(): Promise<Category[]> {
        const data = await this.prisma.category.findMany();
        return data.map(Category.fromPrisma);
    }
}