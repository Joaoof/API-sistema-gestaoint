// src/modules/category/category.module.ts
import { Module } from '@nestjs/common';

import { CategoryController } from './controllers/category.controller';
import { CreateCategoryUseCase } from 'src/core/use-cases/category/create-category.use-case';
import { PrismaService } from 'prisma/prisma.service';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FindAllCategoriesUseCase } from 'src/core/use-cases/category/find-all-categories.use.case';
import { PrismaCategoriesRepository } from 'src/infra/database/implementations/category/category.prisma.repository';
import { RedisService } from 'src/infra/cache/redis.service';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
    imports: [CacheModule.register({
        ttl: 5,
        max: 100
    }),
        RedisModule,
        PrismaModule
    ],
    controllers: [CategoryController],
    providers: [
        CreateCategoryUseCase,
        FindAllCategoriesUseCase,
            {
            provide: 'CategoriesRepository',
            useClass: PrismaCategoriesRepository,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
        // Adicione outros use cases aqui
    ],
    exports: [
        CreateCategoryUseCase,
        FindAllCategoriesUseCase
    ]
})
export class CategoryModule { }