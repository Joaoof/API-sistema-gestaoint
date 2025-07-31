import { Inject } from "@nestjs/common";
import { CreateProductCommand } from "./create-product.command";
import { ICommandHandler } from '@nestjs/cqrs';
import { ProductsRepository } from "src/core/ports/product.repository";
import { Product } from "src/core/entities/product.entity";
import { ProductMapper } from "src/modules/product/mapper/product.mapper";
import { Policy } from 'cockatiel';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductCreatedEvent } from "src/core/events/product-created.event";



export class CreateProductCommandHandler implements ICommandHandler<CreateProductCommand> {
    constructor(
        @Inject('ProductsRepository')
        private readonly productsRepository: ProductsRepository,
        private readonly eventEmitter: EventEmitter2

    ) { }

    async execute(command: CreateProductCommand): Promise<Product> {
        const { dto, userId } = command; // ✅ userId vem do command, não do DTO

        const productData = {
            ...dto,
            createdById: userId, // ✅ Adiciona quem criou
        };

        const product = ProductMapper.toDomain(productData);
        const retryPolicy = Policy.handleAll().retry().attempts(3)

        const savedProduct = await retryPolicy.execute(async () => {
            return await this.productsRepository.create(product, userId);
        });

        this.eventEmitter.emit('product.created', new ProductCreatedEvent(product.id, product.nameProduct))

        return savedProduct;
    }
}