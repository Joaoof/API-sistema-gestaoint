import { Injectable, Inject } from '@nestjs/common';
import { SuppliersRepository } from 'src/core/ports/supplier.repository';

@Injectable()
export class FindByNameSupplierUseCase {
    constructor(
        @Inject('SuppliersRepository')
        private readonly suppliersRepository: SuppliersRepository,
    ) { }

    async execute(name: string) {
        const byName = await this.suppliersRepository.findByNameSupplier(name);
        return byName
    }
}