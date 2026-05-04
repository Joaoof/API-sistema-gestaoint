import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { CompanyFiscalConfigEntity } from './entities/company-fiscal-config.entity';
import { UpsertCompanyFiscalConfigInput } from './dto/upsert-company-fiscal-config.input';
import { CompanyFiscalConfigUseCases } from './use-cases/company-fiscal-config.use-cases';

function requireCompany(user: User): string {
  if (!user.company_id) {
    throw new ForbiddenException(
      'Usuário sem empresa vinculada — não é possível gerenciar configuração fiscal.',
    );
  }
  return user.company_id;
}

@Resolver(() => CompanyFiscalConfigEntity)
@UseGuards(GqlAuthGuard)
export class CompanyFiscalConfigResolver {
  constructor(private readonly useCases: CompanyFiscalConfigUseCases) {}

  @Query(() => CompanyFiscalConfigEntity, { nullable: true })
  async companyFiscalConfig(
    @CurrentUser() user: User,
  ): Promise<CompanyFiscalConfigEntity | null> {
    const companyId = requireCompany(user);
    return this.useCases.get(companyId);
  }

  @Mutation(() => CompanyFiscalConfigEntity)
  async upsertCompanyFiscalConfig(
    @CurrentUser() user: User,
    @Args('input') input: UpsertCompanyFiscalConfigInput,
  ): Promise<CompanyFiscalConfigEntity> {
    const companyId = requireCompany(user);
    return this.useCases.upsert(companyId, input);
  }

  @Mutation(() => Boolean)
  async deleteCompanyFiscalConfig(
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const companyId = requireCompany(user);
    return this.useCases.remove(companyId);
  }
}
