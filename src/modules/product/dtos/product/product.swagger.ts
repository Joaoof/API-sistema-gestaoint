import { ApiProperty } from '@nestjs/swagger';

export class ProductSwaggerDto {
    @ApiProperty({ example: 'Smartphone Samsung Galaxy' })
    nameProduct: string;

    @ApiProperty({ example: 10 })
    quantity: number;

    @ApiProperty({ example: 1200.50, description: 'Preço de custo do produto' })
    costPrice: number;

    @ApiProperty({ example: 1600.00, description: 'Preço de venda do produto' })
    salePrice: number;

    @ApiProperty({
        example: 'c12e4c02-45d7-47f2-a382-a271ed1fbd99',
        description: 'ID da categoria vinculada ao produto'
    })
    categoryId: string;

    @ApiProperty({
        example: 'bd328d5a-85c6-4c3b-88ee-1a90df6d9ea3',
        description: 'ID do fornecedor (opcional)',
        required: false
    })
    supplierId?: string;

    @ApiProperty({
        example: 'Celular com Android 13',
        description: 'Descrição detalhada do produto',
        required: false
    })
    description?: string;
}
