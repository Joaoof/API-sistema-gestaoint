// src/modules/category/dtos/response-category.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
    @ApiProperty({ example: 'cat_001', description: 'ID único da categoria' })
    id!: string;

    @ApiProperty({ example: 'Eletrônicos', description: 'Nome da categoria' })
    name!: string;

    @ApiProperty({
        example: 'Produtos eletrônicos como TVs, celulares e acessórios.',
        description: 'Descrição da categoria',
        nullable: true,
    })
    description!: string | null;

    @ApiProperty({ example: 'ACTIVE', description: 'Status da categoria' })
    status!: string;

    @ApiProperty({
        example: '2025-04-05T10:00:00Z',
        description: 'Data de criação da categoria (ISO 8601)',
    })
    createdAt!: string;

    @ApiProperty({
        example: '2025-04-05T10:00:00Z',
        description: 'Última atualização da categoria (ISO 8601)',
    })
    updatedAt!: string;
}