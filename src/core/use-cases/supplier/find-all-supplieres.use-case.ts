import { Injectable, Inject } from '@nestjs/common';
import { SuppliersRepository } from 'src/core/ports/supplier.repository';

@Injectable()
export class FindAllSupplierUseCase {
    constructor(
        @Inject('SuppliersRepository')
        private readonly suppliersRepository: SuppliersRepository,
    ) { }

    async execute() {
        const byName = await this.suppliersRepository.findAll();
        return byName
    }
}