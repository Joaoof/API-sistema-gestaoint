import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Company } from 'src/core/entities/company.entity';
import {
  CompaniesRepository,
  UpdateCompanyData,
} from 'src/core/ports/company.repository';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    @Inject('CompaniesRepository')
    private readonly repo: CompaniesRepository,
  ) {}

  async execute(id: string, data: UpdateCompanyData): Promise<Company> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    return this.repo.update(id, data);
  }
}
