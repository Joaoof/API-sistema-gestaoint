// src/modules/supplier/dtos/supplier-response.dto.ts

export class SupplierResponseDto {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly phone?: string;
    readonly address?: string;
    readonly createdAt: Date;

    constructor(data: {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        address?: string | null;
        createdAt: Date;
    }) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.phone = data.phone ?? undefined;
        this.address = data.address ?? undefined;
        this.createdAt = data.createdAt;
    }
}