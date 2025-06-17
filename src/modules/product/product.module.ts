// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './controller/product.controller';
import { CreateProductUseCase } from 'src/core/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { FindProductByIdUseCase } from 'src/core/use-cases/product/find-product-by-id.use-case';
import { PrismaProductsRepository } from 'src/infra/database/implementations/product/product.prisma.repository';

@Module({
    controllers: [ProductController],
    providers: [
        // Use Cases
        CreateProductUseCase,
        FindAllProductsUseCase,
        FindProductByIdUseCase,

        // Repository
        {
            provide: 'ProductsRepository',
            useClass: PrismaProductsRepository,
        },
    ],
    exports: [
        CreateProductUseCase,
        FindAllProductsUseCase,
        FindProductByIdUseCase,
    ]
})
export class ProductModule { }