import { ApiProperty } from '@nestjs/swagger';

export class ProductSwaggerDto {
    @ApiProperty({ example: 'Smartphone Samsung Galaxy' })
    nameProduct: string;

    @ApiProperty({ example: 'Eletrônicos' })
    categoryName: string;

    @ApiProperty({ example: 10 })
    quantity: number;

    @ApiProperty({ example: 1200.50 })
    costPrice: number;

    @ApiProperty({ example: 1600.00 })
    salerPrice: number;

    @ApiProperty({ example: 'Samsung Ltda', required: false })
    supplier?: string;

    @ApiProperty({ example: 'Celular com Android 13', required: false })
    description?: string;
}
