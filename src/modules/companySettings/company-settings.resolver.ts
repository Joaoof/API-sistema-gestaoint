import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { UpsertCompanySettingsInput } from './dto/upsert-company-settings.input';
import { CompanySettingsEntity } from './entities/company-settings.entity';
import { CompanySettingsUseCases } from './use-cases/company-settings.use-cases';

@Resolver(() => CompanySettingsEntity)
@UseGuards(GqlAuthGuard)
export class CompanySettingsResolver {
  constructor(
    private readonly useCases: CompanySettingsUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => CompanySettingsEntity)
  async companySettings(
    @CurrentUser() user: AuthUser,
  ): Promise<CompanySettingsEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.getOrCreate(companyId);
  }

  @Mutation(() => CompanySettingsEntity)
  async upsertCompanySettings(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpsertCompanySettingsInput,
  ): Promise<CompanySettingsEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.upsert({ userId: user.id!, companyId }, input);
  }
}
