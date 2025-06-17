// src/modules/product/controller/product.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ProductSwagger } from 'src/modules/docs/product.swagger';
import { CreateProductUseCase } from 'src/core/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { FindProductByIdUseCase } from 'src/core/use-cases/product/find-product-by-id.use-case';
import { ProductMapper } from '../mapper/product.mapper';
import { NotFoundError } from 'src/core/exceptions/api.exception';
import { NotFoundException } from '@nestjs/common';
import { CreateProductDto } from '../dtos/create-product.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductController {
    constructor(
        private readonly createProductUseCase: CreateProductUseCase,
        private readonly findAllProductsUseCase: FindAllProductsUseCase,
        private readonly findProductByIdUseCase: FindProductByIdUseCase
    ) { }

    @Post()
    @ProductSwagger.create
    async create(@Body() dto: CreateProductDto) {
        const product = await this.createProductUseCase.execute(dto);
        return ProductMapper.toJSON(product);
    }

    @Get()
    @ProductSwagger.findAll
    async getAll() {
        const products = await this.findAllProductsUseCase.execute();
        return products.map(ProductMapper.toJSON);
    }

    @Get(':id')
    @ProductSwagger.findOne
    async getById(@Param('id') id: string) {
        try {
            const product = await this.findProductByIdUseCase.execute(id);
            return ProductMapper.toJSON(product);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}