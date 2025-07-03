// src/core/use-cases/supplier/create-supplier.use-case.ts

import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import { Supplier } from 'src/core/entities/supplier.entity';
import { SuppliersRepository } from 'src/core/ports/supplier.repository';
import { CreateSupplierDto } from 'src/modules/supplier/dtos/create-supplier.dto'; // ajuste o caminho real
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CreateSupplierUseCase {
    constructor(
        @Inject('SuppliersRepository')
        private readonly suppliersRepository: SuppliersRepository,
    ) { }

    async execute(dto: CreateSupplierDto): Promise<Supplier> {
        this.validateInput(dto);

        const supplier = new Supplier(
            uuidv4(),
            dto.name,
            dto.email ?? null,
            dto.phone ?? null,
            dto.address ?? null,
            new Date()
        );

        await this.suppliersRepository.create(supplier);

        return supplier;
    }

    private validateInput(dto: CreateSupplierDto): void {
        if (!dto.name || !dto.email || !dto.phone || !dto.address) {
            throw new BadRequestException('Invalid supplier data provided.');
        }
    }
}