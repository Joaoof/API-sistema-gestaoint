// src/modules/product/dtos/product-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
    @ApiProperty({ example: 'prod_001' })
    id: string;

    @ApiProperty({ example: 'Notebook Dell' })
    name: string;

    @ApiProperty({ example: 'Computador topo de linha' })
    description: string | null;

    @ApiProperty({ example: 8999.99 })
    price: number;

    @ApiProperty({ example: 'cat_tecnologia' })
    categoryId: string;

    @ApiProperty({ example: 'sup_dell' })
    supplierId: string;

    @ApiProperty({ example: '2025-06-17T10:00:00Z' })
    createdAt: string;
}