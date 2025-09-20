import { Category } from '../../../../core/entities/category.entity';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CategoriesRepository } from 'src/core/ports/category.repository';
import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/infra/cache/redis.service';

@Injectable()
export class PrismaCategoriesRepository implements CategoriesRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) { }

    async create(category: Category): Promise<void> {
        await this.prisma.category.create({ data: category });
        await this.redis.delete('categories', 'all');
    }

    async findById(id: string): Promise<Category | null> {
        const cached = await this.redis.get('category');
        if (cached) return Category.fromPrisma(JSON.parse(cached));

        const data = await this.prisma.category.findUnique({ where: { id } });
        if (!data) return null;

        const category = Category.fromPrisma(data);
        await this.redis.set(`category:${id}`, 3600); // cache por 30s
        return category;
    }

    async findAll(): Promise<Category[]> {
        const cached = await this.redis.get('categories:all');
        if (cached) return JSON.parse(cached).map(Category.fromPrisma);

        const data = await this.prisma.category.findMany();
        await this.redis.set('categories:all', 3600);
        return data.map(Category.fromPrisma);
    }

    async findActiveCategories() {
        return this.prisma.category.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                name: true,
                status: true
            }
        })
    }

    async findByCategoryUser(userId: string): Promise<Category[]> {

        const categoryCached = await this.redis.get(`categories:${userId}`,);

        const categories = await this.prisma.category.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                status: true,
                description: true,
                userId: true
            }
        });
        return JSON.parse(categoryCached ?? '') ?? categories.map(Category.fromPrisma);
    }
}