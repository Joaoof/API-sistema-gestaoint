// src/core/use-cases/product/create-product.use-case.ts
import { Product } from 'src/core/entities/product.entity';
import { ProductsRepository } from 'src/core/ports/product.repository';
import { CreateProductDto } from 'src/modules/product/dtos/create-product.dto';
import { ProductMapper } from 'src/modules/product/mapper/product.mapper';
import { MailService } from 'src/core/ports/mail.service';
import { EmailQueueService } from 'src/infra/queues/email-queue.service';
import { Inject } from '@nestjs/common';

export class CreateProductUseCase {
    constructor(
        @Inject('ProductsRepository')
        private readonly productsRepository: ProductsRepository,
        private emailQueue: EmailQueueService,
    ) { }

    async execute(dto: CreateProductDto): Promise<Product> {
        const product = ProductMapper.toDomain(dto);
        await this.productsRepository.create(product);

        // Notificação por e-mail (ex: para admin ou fornecedor)
        // await this.emailQueue.addEmailJob({
        //     to: 'admin@example.com',
        //     subject: 'Produto criado',
        //     html: `<p>O produto ${product.nameProduct} foi criado.</p>`
        // });

        return product;
    }
}