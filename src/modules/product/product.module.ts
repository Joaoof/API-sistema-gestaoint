// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './controller/product.controller';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { FindProductByIdUseCase } from 'src/core/use-cases/product/find-product-by-id.use-case';
import { PrismaProductsRepository } from 'src/infra/database/implementations/product/product.prisma.repository';
import { PrismaModule } from 'prisma/prisma.module';
import { EmailQueueService } from 'src/infra/queues/email-queue.service';
import { QueuesModule } from 'src/infra/queues/queue.module';
import { EmailQueueListener } from 'src/infra/queues/email-queue.listener';
import { CreateProductCommandHandler } from 'src/core/use-cases/product/create-product/create-product.handler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommandBus } from '@nestjs/cqrs';
import { ProductResolver } from 'src/infra/graphql/resolvers/product.resolver';

@Module({
    imports: [
        EventEmitterModule.forRoot(),
        PrismaModule,
        QueuesModule
    ],
    controllers: [ProductController],
    providers: [
        CreateProductCommandHandler,
        CommandBus,
        FindAllProductsUseCase,
        FindProductByIdUseCase,
        EmailQueueService,
        EmailQueueListener,
        ProductResolver,
        // Repository
        {
            provide: 'ProductsRepository',
            useClass: PrismaProductsRepository,
        },
    ],
    exports: [
        CreateProductCommandHandler,
        FindAllProductsUseCase,
        FindProductByIdUseCase,
        EmailQueueService
    ]
})
export class ProductModule { }