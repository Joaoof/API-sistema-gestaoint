// src/modules/category/category.module.ts
import { Module } from '@nestjs/common';

import { CategoryController } from './controllers/category.controller';
import { CreateCategoryUseCase } from 'src/core/use-cases/category/create-category.use-case';
import { PrismaService } from 'prisma/prisma.service';

@Module({
    controllers: [CategoryController],
    providers: [
        PrismaService,
        CreateCategoryUseCase,
        // Adicione outros use cases aqui
    ],
    exports: [
        CreateCategoryUseCase,
    ]
})
export class CategoryModule { }