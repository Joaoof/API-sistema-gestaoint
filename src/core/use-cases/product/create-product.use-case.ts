// src/core/use-cases/product/create-product.use-case.ts
import { Product } from 'src/core/entities/product.entity';
import { ProductsRepository } from 'src/core/ports/product.repository';
import { CreateProductDto } from 'src/modules/product/dtos/create-product.dto';
import { ProductMapper } from 'src/modules/product/mapper/product.mapper';
import { MailService } from 'src/core/ports/mail.service';

export class CreateProductUseCase {
    constructor(
        private readonly productsRepository: ProductsRepository,
        private readonly mailService: MailService
    ) { }

    async execute(dto: CreateProductDto): Promise<Product> {
        const product = ProductMapper.toDomain(dto);
        await this.productsRepository.create(product);

        // Notificação por e-mail (ex: para admin ou fornecedor)
        await this.mailService.sendMailProduct(
            'admin@seusistema.com',
            'Novo Produto Criado',
            `<p>O produto <strong>${product.name}</strong> foi adicionado ao sistema.</p>`
        );

        return product;
    }
}