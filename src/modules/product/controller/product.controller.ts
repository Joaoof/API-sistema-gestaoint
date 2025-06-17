// src/modules/product/controller/product.controller.ts
import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    NotFoundException,
} from '@nestjs/common';

import { CreateProductUseCase } from 'src/core/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { FindProductByIdUseCase } from 'src/core/use-cases/product/find-product-by-id.use-case';
import { CreateProductDto } from '../dtos/create-product.dto';
import { ProductMapper } from '../mapper/product.mapper';
import { NotFoundError } from 'src/core/exceptions/api.exception';

@Controller('products')
export class ProductController {
    constructor(
        private readonly createProductUseCase: CreateProductUseCase,
        private readonly findAllProductsUseCase: FindAllProductsUseCase,
        private readonly findProductByIdUseCase: FindProductByIdUseCase
    ) { }

    @Post()
    async create(@Body() dto: CreateProductDto) {
        const product = await this.createProductUseCase.execute(dto)
        return ProductMapper.toJSON(product); // Entidade -> JSON

    }

    @Get()
    async getAll() {
        const products = await this.findAllProductsUseCase.execute();
        return products.map(ProductMapper.toJSON); // Entidade[] -> JSON[]
    }

    @Get(':id')
    async getById(@Param('id') id: string) {
        try {
            const product = await this.findProductByIdUseCase.execute(id);
            return product;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new NotFoundException(error.message);
            }
            throw error; // Passa outros erros para o middleware global
        }
    }
}