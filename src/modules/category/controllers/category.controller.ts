// category.controller.ts
import {
    Controller,
    Post,
    Body,
    HttpStatus,
    UseInterceptors,
    Get,
    Param,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBody,
    ApiResponse,
} from '@nestjs/swagger';

import { CreateCategorySwaggerDto } from '../dtos/category/category-swagger.dto';
import { CreateCategoryDto, CreateCategorySchema } from '../dtos/create-category.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CategoryMapper } from '../mappers/category.mapper';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
    @Post()
    @ApiOperation({ summary: 'Cria uma nova categoria' })
    @ApiBody({
        type: CreateCategorySwaggerDto,
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Categoria criada com sucesso',
        type: CreateCategorySwaggerDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Dados inválidos',
    })
    async create(@Body() dto: CreateCategoryDto) {
        // Valida manualmente com Zod
        const result = CreateCategorySchema.safeParse(dto);
        if (!result.success) {
            throw new Error('Dados inválidos');
        }

        return {
            id: 'cat_001',
            ...result.data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    @UseInterceptors(CacheInterceptor)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const category = await this.findOne(id);
        if (!category) throw new NotFoundException('Categoria não encontrada');

        return CategoryMapper.toJSON(category);
    }
}