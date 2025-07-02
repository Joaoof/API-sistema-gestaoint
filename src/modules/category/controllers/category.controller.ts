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
import { FindAllCategoriesUseCase } from 'src/core/use-cases/category/find-all-categories.use.case';
import { CreateCategoryUseCase } from 'src/core/use-cases/category/create-category.use-case';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
    constructor(
        private readonly createCategoryUseCase: CreateCategoryUseCase,
        private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
        // private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase
    ) { }
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

        const result = await this.createCategoryUseCase.execute(dto);
        if (!result) {
            console.error(JSON.stringify(result, null, 2));
        }
        return result
    }

    @UseInterceptors(CacheInterceptor)
    @Get()
    async findAll() {
        const categories = await this.findAllCategoriesUseCase.execute();
        console.log(categories);

        return categories.map(CategoryMapper.toResponseJSON);
    }
}