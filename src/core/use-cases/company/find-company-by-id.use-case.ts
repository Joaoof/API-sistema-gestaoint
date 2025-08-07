import { Inject, Injectable } from '@nestjs/common';
import { Company } from 'src/core/entities/company.entity';
import { CompaniesRepository } from 'src/core/ports/company.repository';

@Injectable()
export class FindCompanyByIdUseCase {
    constructor(
        @Inject('CompaniesRepository')
        private readonly companiesRepository: CompaniesRepository,
    ) { }

    async execute(id: string): Promise<Company | null> {
        return this.companiesRepository.findById(id);
    }
}
