// category.swagger.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategorySwaggerDto {
    @ApiProperty({ example: 'Eletrônicos', description: 'Nome da categoria' })
    name!: string;

    @ApiProperty({
        example: 'Produtos eletrônicos como TVs e celulares',
        description: 'Descrição opcional da categoria',
        nullable: true,
        required: false,
    })
    description?: string | null;

    @ApiProperty({
        example: 'ACTIVE',
        description: 'Status da categoria',
        enum: ['ACTIVE', 'INACTIVE'],
    })
    status!: 'ACTIVE' | 'INACTIVE';
}