// src/modules/supplier/dtos/supplier/supplier.swagger.ts

import { ApiProperty } from '@nestjs/swagger';

export class SupplierSwaggerDto {
    @ApiProperty({ example: 'abc123', description: 'ID único do fornecedor' })
    id: string;

    @ApiProperty({ example: 'Tech Supplies Ltda', description: 'Nome do fornecedor' })
    name: string;

    @ApiProperty({ example: 'contact@techsupplies.com', description: 'E-mail do fornecedor' })
    email: string;

    @ApiProperty({ example: '+5511987654321', description: 'Telefone do fornecedor' })
    phone?: string;

    @ApiProperty({ example: 'Rua das Tecnologias, 123', description: 'Endereço do fornecedor' })
    address?: string;

    @ApiProperty({ example: '2024-05-01T12:00:00Z', description: 'Data de criação' })
    createdAt: Date;
}