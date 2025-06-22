// src/modules/category/category.module.ts
import { Module } from '@nestjs/common';

import { CategoryController } from './controllers/category.controller';
import { CreateCategoryUseCase } from 'src/core/use-cases/category/create-category.use-case';
import { PrismaService } from 'prisma/prisma.service';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
    imports: [CategoryModule, CacheModule.register({
        ttl: 5,
        max: 100
    }),
    ],
    controllers: [CategoryController],
    providers: [
        PrismaService,
        CreateCategoryUseCase,
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
        // Adicione outros use cases aqui
    ],
    exports: [
        CreateCategoryUseCase,
    ]
})
export class CategoryModule { }