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
  constructor(private readonly useCases: AccountPayableUseCases) {}

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
    @Args('input') input: CreateAccountPayableInput,
  ): Promise<AccountPayableEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => AccountPayableEntity)
  async updateAccountPayable(
    @Args('input') input: UpdateAccountPayableInput,
  ): Promise<AccountPayableEntity> {
    return this.useCases.update(input);
  }

  @Mutation(() => Boolean)
  async deleteAccountPayable(@Args('id') id: string): Promise<boolean> {
    return this.useCases.delete(id);
  }
}
