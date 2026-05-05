import { UseGuards } from '@nestjs/common';
import { Args, Field, Float, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CreateAccountReceivableInput } from './dto/create-account-receivable.input';
import { UpdateAccountReceivableInput } from './dto/update-account-receivable.input';
import { AccountReceivableEntity } from './entities/account-receivable.entity';
import { AccountReceivableUseCases } from './use-cases/account-receivable.use-cases';

@ObjectType()
export class AccountReceivableSummary {
  @Field(() => Float) total!: number;
  @Field(() => Float) pending!: number;
  @Field(() => Float) paid!: number;
  @Field(() => Float) overdue!: number;
  @Field(() => Int) countTotal!: number;
}

@Resolver(() => AccountReceivableEntity)
@UseGuards(GqlAuthGuard)
export class AccountReceivableResolver {
  constructor(
    private readonly useCases: AccountReceivableUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [AccountReceivableEntity])
  async accountsReceivable(
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => AccountStatus, nullable: true })
    status?: AccountStatus,
  ): Promise<AccountReceivableEntity[]> {
    return this.useCases.list({ search, status });
  }

  @Query(() => AccountReceivableEntity)
  async accountReceivable(
    @Args('id') id: string,
  ): Promise<AccountReceivableEntity> {
    return this.useCases.findById(id);
  }

  @Query(() => AccountReceivableSummary)
  async accountsReceivableSummary(): Promise<AccountReceivableSummary> {
    return this.useCases.summary();
  }

  @Mutation(() => AccountReceivableEntity)
  async createAccountReceivable(
    @CurrentUser() user: User,
    @Args('input') input: CreateAccountReceivableInput,
  ): Promise<AccountReceivableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id, companyId }, input);
  }

  @Mutation(() => AccountReceivableEntity)
  async updateAccountReceivable(
    @CurrentUser() user: User,
    @Args('input') input: UpdateAccountReceivableInput,
  ): Promise<AccountReceivableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async deleteAccountReceivable(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.delete({ userId: user.id, companyId }, id);
  }
}
