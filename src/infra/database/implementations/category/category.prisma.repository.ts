// src/infra/database/implementations/category.prisma.repository.ts

import { Category } from '../../../../core/entities/category.entity';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CategoriesRepository } from 'src/core/ports/category.repository';
import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/infra/cache/redis.service'; // você precisa criar esse serviço

@Injectable()
export class PrismaCategoriesRepository implements CategoriesRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) { }

    async create(category: Category): Promise<void> {
        await this.prisma.category.create({ data: category });
        await this.redis.del('categories:all'); // limpa cache após inserção
    }

    async findById(id: string): Promise<Category | null> {
        const cached = await this.redis.get(`category:${id}`);
        if (cached) return Category.fromPrisma(JSON.parse(cached));

        const data = await this.prisma.category.findUnique({ where: { id } });
        if (!data) return null;

        const category = Category.fromPrisma(data);
        await this.redis.setex(`category:${id}`, 30, JSON.stringify(category)); // cache por 30s
        return category;
    }

    // async findAll(page: number = 1, limit: number = 20): Promise<Category[]> {
    //     const key = `categories:all:page${page}:limit${limit}`;
    //     const cached = await this.redis.get(key);
    //     if (cached) return JSON.parse(cached).map(Category.fromPrisma);

    //     const data = await this.prisma.category.findMany({
    //         skip: (page - 1) * limit,
    //         take: limit
    //     });

    //     await this.redis.setex(key, 30, JSON.stringify(data));
    //     return data.map(Category.fromPrisma);
    // }

    async findAll(): Promise<Category[]> {
        const cached = await this.redis.get('categories:all');
        if (cached) return JSON.parse(cached).map(Category.fromPrisma);

        const data = await this.prisma.category.findMany();
        await this.redis.setex('categories:all', 60, JSON.stringify(data));
        return data.map(Category.fromPrisma);
    }
}