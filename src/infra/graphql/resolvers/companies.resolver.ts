import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CompanyDto, UpdateCompanyInput } from 'src/core/dtos/company.dto';
import { Company } from 'src/core/entities/company.entity';
import { FindCompanyByIdUseCase } from 'src/core/use-cases/company/find-company-by-id.use-case';
import { UpdateCompanyUseCase } from 'src/core/use-cases/company/update-company.use-case';
import { PrismaService } from '../../../../prisma/prisma.service';

interface AuthUser {
  id?: string;
  sub?: string;
  company_id?: string;
}

function toDto(company: Company): CompanyDto {
  return {
    id: company.id,
    name: company.name ?? '',
    email: company.email,
    phone: company.phone,
    address: company.address,
    cnpj: company.cnpj,
    logoUrl: company.logoUrl,
    nomeFantasia: company.nomeFantasia,
    razaoSocial: company.razaoSocial,
    inscricaoEstadual: company.inscricaoEstadual,
    bairro: company.bairro,
    cidade: company.cidade,
    estado: company.estado,
    cep: company.cep,
    latitude: company.latitude,
    longitude: company.longitude,
  };
}

@Resolver(() => CompanyDto)
export class CompaniesResolver {
  constructor(
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => CompanyDto, { name: 'company' })
  async company(@Args('id') id: string): Promise<CompanyDto | null> {
    const company = await this.findCompanyByIdUseCase.execute(id);
    if (!company) return null;
    return toDto(company);
  }

  @Query(() => CompanyDto, { name: 'myCompany', nullable: true })
  @UseGuards(GqlAuthGuard)
  async myCompany(@CurrentUser() user: AuthUser): Promise<CompanyDto | null> {
    const userId = user?.id ?? user?.sub;
    if (!userId) return null;

    let companyId = user?.company_id;
    if (!companyId) {
      const u = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { company_id: true },
      });
      companyId = u?.company_id;
    }
    if (!companyId) return null;

    const company = await this.findCompanyByIdUseCase.execute(companyId);
    return company ? toDto(company) : null;
  }

  @Mutation(() => CompanyDto, { name: 'updateCompany' })
  @UseGuards(GqlAuthGuard)
  async updateCompany(
    @Args('id') id: string,
    @Args('input') input: UpdateCompanyInput,
  ): Promise<CompanyDto> {
    const updated = await this.updateCompanyUseCase.execute(id, {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      cnpj: input.cnpj ?? null,
      logoUrl: input.logoUrl ?? null,
      nomeFantasia: input.nomeFantasia ?? null,
      razaoSocial: input.razaoSocial ?? null,
      inscricaoEstadual: input.inscricaoEstadual ?? null,
      bairro: input.bairro ?? null,
      cidade: input.cidade ?? null,
      estado: input.estado ?? null,
      cep: input.cep ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    });
    return toDto(updated);
  }
}
