import { Resolver, Query, Args } from '@nestjs/graphql';
import { FindCompanyByIdUseCase } from 'src/core/use-cases/company/find-company-by-id.use-case';
import { CompanyDto } from 'src/core/dtos/company.dto';
import { Company } from 'src/core/entities/company.entity';

@Resolver(() => Company)
export class CompaniesResolver {
  private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase;

  constructor(findCompanyByIdUseCase: FindCompanyByIdUseCase) {
    this.findCompanyByIdUseCase = findCompanyByIdUseCase;
  }

  @Query(() => CompanyDto, { name: 'company' })
  async company(@Args('id') id: string): Promise<CompanyDto | null> {
    const company = await this.findCompanyByIdUseCase.execute(id);

    if (!company) return null;

    return {
      id: company.id,
      name: company.name ?? '',
      email: company.email,
      phone: company.phone,
      address: company.address,
      logoUrl: company.logoUrl,
    };
  }
}
