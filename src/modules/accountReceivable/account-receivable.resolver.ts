import { UseGuards } from '@nestjs/common';
import { Args, Field, Float, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
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
  constructor(private readonly useCases: AccountReceivableUseCases) {}

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
    @Args('input') input: CreateAccountReceivableInput,
  ): Promise<AccountReceivableEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => AccountReceivableEntity)
  async updateAccountReceivable(
    @Args('input') input: UpdateAccountReceivableInput,
  ): Promise<AccountReceivableEntity> {
    return this.useCases.update(input);
  }

  @Mutation(() => Boolean)
  async deleteAccountReceivable(@Args('id') id: string): Promise<boolean> {
    return this.useCases.delete(id);
  }
}
