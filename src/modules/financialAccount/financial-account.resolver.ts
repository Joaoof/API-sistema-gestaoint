import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import {
  CreateFinancialAccountInput,
  FinancialAccountFilterInput,
  UpdateFinancialAccountInput,
} from './dto/financial-account.input';
import {
  FinancialAccountEntity,
  FinancialAccountTreeNode,
} from './entities/financial-account.entity';
import { FinancialAccountUseCases } from './use-cases/financial-account.use-cases';

@Resolver(() => FinancialAccountEntity)
@UseGuards(GqlAuthGuard)
export class FinancialAccountResolver {
  constructor(
    private readonly useCases: FinancialAccountUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [FinancialAccountEntity])
  async financialAccounts(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: FinancialAccountFilterInput,
  ): Promise<FinancialAccountEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, filter ?? {});
  }

  @Query(() => [FinancialAccountTreeNode])
  async financialAccountsTree(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: FinancialAccountFilterInput,
  ): Promise<FinancialAccountTreeNode[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.tree(companyId, filter ?? {});
  }

  @Query(() => FinancialAccountEntity)
  async financialAccount(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<FinancialAccountEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => FinancialAccountEntity)
  async createFinancialAccount(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateFinancialAccountInput,
  ): Promise<FinancialAccountEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => FinancialAccountEntity)
  async updateFinancialAccount(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateFinancialAccountInput,
  ): Promise<FinancialAccountEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => Boolean)
  async deleteFinancialAccount(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id!, companyId }, id);
  }

  @Mutation(() => [FinancialAccountEntity])
  async seedDefaultFinancialAccounts(
    @CurrentUser() user: AuthUser,
  ): Promise<FinancialAccountEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.seedDefaults({ userId: user.id!, companyId });
  }
}
