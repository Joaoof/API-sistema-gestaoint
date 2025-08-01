// src/modules/category/category.module.ts
import { Module } from '@nestjs/common';

import { CategoryController } from './controllers/category.controller';
import { CreateCategoryUseCase } from 'src/core/use-cases/category/create-category.use-case';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FindAllCategoriesUseCase } from 'src/core/use-cases/category/find-all-categories.use.case';
import { PrismaCategoriesRepository } from 'src/infra/database/implementations/category/category.prisma.repository';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaModule } from 'prisma/prisma.module';
import { CategoriesResolver } from 'src/infra/graphql/resolvers/category.resolver';
import { GqlCacheInterceptor } from 'src/shared/guards/gql-cache-interceptor.guard';
import { FindActiveCategoriesUseCase } from 'src/core/use-cases/category/find-by-active-categories.use-case';

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
        FindActiveCategoriesUseCase,
        {
            provide: 'CategoriesRepository',
            useClass: PrismaCategoriesRepository,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: GqlCacheInterceptor,
        },
        CategoriesResolver
        // Adicione outros use cases aqui
    ],
    exports: [
        CreateCategoryUseCase,
        FindAllCategoriesUseCase,
        FindActiveCategoriesUseCase
    ]
})
export class CategoryModule { }