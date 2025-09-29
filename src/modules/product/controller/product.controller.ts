// src/modules/product/controller/product.controller.ts
import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
} from '@nestjs/swagger';

import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { FindProductByIdUseCase } from 'src/core/use-cases/product/find-product-by-id.use-case';
import { ProductMapper } from '../mapper/product.mapper';
import { NotFoundError } from 'src/core/exceptions/api.exception';
import { CreateProductDto } from 'src/core/use-cases/dtos/create-product.core-dto';
import { ProductResponseDto } from '../dtos/response-product.dto';
import { ProductSwaggerDto } from '../dtos/product/product.swagger';
import { CommandBus } from '@nestjs/cqrs';

@ApiTags('products') // ← Tag que aparecerá no Swagger
@Controller('products')
export class ProductController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly findAllProductsUseCase: FindAllProductsUseCase,
        private readonly findProductByIdUseCase: FindProductByIdUseCase
    ) { }

    @Post()
    @ApiOperation({ summary: 'Cria um novo produto' }) // Sumário da rota
    @ApiBody({ type: ProductSwaggerDto }) // Documenta o payload
    @ApiResponse({
        status: 201,
        description: 'Produto criado com sucesso',
        type: ProductResponseDto
    })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    async create(@Body() dto: CreateProductDto) {
        const product = await this.commandBus.execute(dto);
        if (!product) {
            console.error(JSON.stringify(product, null, 2));
        }

        return product;
    }

    @Get()
    @ApiOperation({ summary: 'Lista todos os produtos' }) // Descrição da rota
    @ApiResponse({
        status: 200,
        description: 'Lista de produtos',
        type: ProductResponseDto,
        isArray: true
    })
    async getAll(): Promise<ProductResponseDto[]> {
        const products = await this.findAllProductsUseCase.execute();
        return products.map(ProductMapper.toJSON);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Busca produto por ID' })
    @ApiResponse({
        status: 200,
        description: 'Produto encontrado',
        type: ProductResponseDto
    })
    @ApiResponse({ status: 404, description: 'Produto não encontrado' })
    async getById(@Param('id') id: string): Promise<ProductResponseDto> {
        try {
            const product = await this.findProductByIdUseCase.execute(id);
            console.log('Produto criado:', product);
            return ProductMapper.toJSON(product);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}