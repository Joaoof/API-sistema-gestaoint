import { Inject, Injectable } from '@nestjs/common';
import { Company } from 'src/core/entities/company.entity';
import { CompaniesRepository } from 'src/core/ports/company.repository';

@Injectable()
export class FindCompanyByIdUseCase {
  private readonly companiesRepository: CompaniesRepository;
  constructor(
    @Inject('CompaniesRepository')
    companiesRepository: CompaniesRepository,
  ) {
    this.companiesRepository = companiesRepository;
  }

  async execute(id: string): Promise<Company | null> {
    const teste = await this.companiesRepository.findById(id);
    return teste;
  }
}
