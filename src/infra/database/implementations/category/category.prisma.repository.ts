import { Category } from '../../../../core/entities/category.entity';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CategoriesRepository } from 'src/core/ports/category.repository';
import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/infra/cache/redis.service';
import { CategoryMapper } from 'src/modules/category/mappers/category.mapper';

@Injectable()
export class PrismaCategoriesRepository implements CategoriesRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) { }

    async create(category: Category): Promise<void> {
        await this.prisma.category.create({ data: category.toJSON() });
        await this.redis.delete('categories:all');
        await this.redis.delete(`category:${category.id}`);
    }

    async findById(id: string): Promise<Category | null> {
        const cacheKey = `category:${id}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) return CategoryMapper.toDomain(JSON.parse(cached));

        const data = await this.prisma.category.findUnique({ where: { id } });
        if (!data) return null;

        const category = CategoryMapper.toDomain(data);

        await this.redis.set(cacheKey, JSON.stringify(category.toJSON()), 3600);
        return category;
    }

    async findAll(): Promise<Category[]> {
        const cached = await this.redis.get('categories:all');

        if (cached) return JSON.parse(cached).map(CategoryMapper.toDomain);

        const data = await this.prisma.category.findMany();

        const categories = data.map(CategoryMapper.toDomain);

        await this.redis.set('categories:all', JSON.stringify(categories.map(c => c.toJSON())), 3600);

        return categories;
    }

    async findActiveCategories(): Promise<Category[]> {
        const data = await this.prisma.category.findMany({
            where: { status: 'ACTIVE' },
        });

        return data.map(CategoryMapper.toDomain);
    }

    async findByCategoryUser(userId: string): Promise<Category[]> {
        const categoryCached = await this.redis.get(`categories:${userId}`);

        if (categoryCached) return JSON.parse(categoryCached).map(CategoryMapper.toDomain);

        const data = await this.prisma.category.findMany({
            where: { userId },
        });

        const categories = data.map(CategoryMapper.toDomain);

        await this.redis.set(`categories:${userId}`, JSON.stringify(categories.map(c => c.toJSON())), 3600);

        return categories;
    }
}