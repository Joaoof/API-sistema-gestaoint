// src/modules/supplier/controllers/supplier.controller.ts

import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
} from '@nestjs/swagger';

import { CreateSupplierUseCase } from 'src/core/use-cases/supplier/create-supplier.use-case';
import { SupplierMapper } from '../mapper/supplier.mapper';
import { NotFoundError } from 'src/core/exceptions/api.exception';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';
import { SupplierResponseDto } from '../dtos/response-supplier.dto';
import { SupplierSwaggerDto } from '../dtos/supplier/supllier.swagger';


@ApiTags('Suppliers')
@Controller({ path: 'suppliers', version: '1' })
export class SupplierController {
    constructor(
        private readonly createSupplier: CreateSupplierUseCase,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Criar fornecedor' })
    @ApiBody({ type: SupplierSwaggerDto })
    @ApiResponse({ status: 201, description: 'Criado com sucesso', type: SupplierResponseDto })
    @ApiResponse({ status: 400, description: 'Requisição inválida' })
    async create(@Body() dto: CreateSupplierDto): Promise<SupplierResponseDto> {
        const result = await this.createSupplier.execute(dto);
        return SupplierMapper.toResponse(result);
    }

    //   @Get(':id')
    //   @Roles('admin', 'user')
    //   @ApiOperation({ summary: 'Buscar fornecedor por ID' })
    //   @ApiResponse({ status: 200, description: 'Fornecedor encontrado', type: SupplierResponseDto })
    //   @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
    //   async findById(@Param('id') id: string): Promise<any> {
    //     this.logger.log(`Buscando fornecedor por ID: ${id}`);
    //     try {
    //       const result = await this.findSupplierById.execute(id);
    //       const supplier = SupplierMapper.toResponse(result);
    //       return {
    //         ...supplier,
    //         _links: {
    //           self: `/api/v1/suppliers/${supplier.id}`,
    //           all: '/api/v1/suppliers',
    //         },
    //       };
    //     } catch (err) {
    //       if (err instanceof NotFoundError) {
    //         throw new NotFoundException(err.message);
    //       }
    //       throw err;
    //     }
}
