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

import { CreateProductUseCase } from 'src/core/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { FindProductByIdUseCase } from 'src/core/use-cases/product/find-product-by-id.use-case';
import { ProductMapper } from '../mapper/product.mapper';
import { NotFoundError } from 'src/core/exceptions/api.exception';
import { CreateProductDto } from '../dtos/create-product.dto';
import { CreateProductSchema } from '../dtos/create-product.dto';
import { ProductResponseDto } from '../dtos/response-product.dto';

@ApiTags('products') // ← Tag que aparecerá no Swagger
@Controller('products')
export class ProductController {
    constructor(
        private readonly createProductUseCase: CreateProductUseCase,
        private readonly findAllProductsUseCase: FindAllProductsUseCase,
        private readonly findProductByIdUseCase: FindProductByIdUseCase
    ) { }

    @Post()
    @ApiOperation({ summary: 'Cria um novo produto' }) // Sumário da rota
    @ApiBody({
        schema: {
            $ref: '/home/joaoof/sistema-gestao/jc/src/modules/product/dtos/create-produ ct.dto.ts', // ← Referência exata
        },
    }) // Documenta o payload
    @ApiResponse({
        status: 201,
        description: 'Produto criado com sucesso',
        type: ProductResponseDto
    })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
        const product = await this.createProductUseCase.execute(dto);
        return ProductMapper.toJSON(product);
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
            return ProductMapper.toJSON(product);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}