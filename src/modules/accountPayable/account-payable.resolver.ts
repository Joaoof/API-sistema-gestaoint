import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Float,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CreateAccountPayableInput } from './dto/create-account-payable.input';
import { UpdateAccountPayableInput } from './dto/update-account-payable.input';
import { AccountPayableEntity } from './entities/account-payable.entity';
import { AccountPayableUseCases } from './use-cases/account-payable.use-cases';

@ObjectType()
export class AccountPayableSummary {
  @Field(() => Float) total!: number;
  @Field(() => Float) pending!: number;
  @Field(() => Float) paid!: number;
  @Field(() => Float) overdue!: number;
  @Field(() => Int) countTotal!: number;
}

@Resolver(() => AccountPayableEntity)
@UseGuards(GqlAuthGuard)
export class AccountPayableResolver {
  constructor(
    private readonly useCases: AccountPayableUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [AccountPayableEntity])
  async accountsPayable(
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => AccountStatus, nullable: true })
    status?: AccountStatus,
  ): Promise<AccountPayableEntity[]> {
    return this.useCases.list({ search, status });
  }

  @Query(() => AccountPayableEntity)
  async accountPayable(
    @Args('id') id: string,
  ): Promise<AccountPayableEntity> {
    return this.useCases.findById(id);
  }

  @Query(() => AccountPayableSummary)
  async accountsPayableSummary(): Promise<AccountPayableSummary> {
    return this.useCases.summary();
  }

  @Mutation(() => AccountPayableEntity)
  async createAccountPayable(
    @CurrentUser() user: User,
    @Args('input') input: CreateAccountPayableInput,
  ): Promise<AccountPayableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id, companyId }, input);
  }

  @Mutation(() => AccountPayableEntity)
  async updateAccountPayable(
    @CurrentUser() user: User,
    @Args('input') input: UpdateAccountPayableInput,
  ): Promise<AccountPayableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async deleteAccountPayable(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.delete({ userId: user.id, companyId }, id);
  }
}
