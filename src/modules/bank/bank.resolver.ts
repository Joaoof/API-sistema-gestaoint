import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { CreateBankInput, UpdateBankInput } from './dto/create-bank.input';
import { BankEntity } from './entities/bank.entity';
import { BankUseCases } from './use-cases/bank.use-cases';

@Resolver(() => BankEntity)
@UseGuards(GqlAuthGuard)
export class BankResolver {
  constructor(private readonly useCases: BankUseCases) {}

  @Query(() => [BankEntity])
  async banks(
    @CurrentUser() user: User,
    @Args('search', { nullable: true }) search?: string,
    @Args('activeOnly', { nullable: true }) activeOnly?: boolean,
  ): Promise<BankEntity[]> {
    return this.useCases.list(user.id, { search, activeOnly });
  }

  @Query(() => BankEntity)
  async bank(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<BankEntity> {
    return this.useCases.findById(user.id, id);
  }

  @Mutation(() => BankEntity)
  async createBank(
    @CurrentUser() user: User,
    @Args('input') input: CreateBankInput,
  ): Promise<BankEntity> {
    return this.useCases.create(user.id, input);
  }

  @Mutation(() => BankEntity)
  async updateBank(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateBankInput,
  ): Promise<BankEntity> {
    return this.useCases.update(user.id, id, input);
  }

  @Mutation(() => Boolean)
  async deleteBank(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.useCases.remove(user.id, id);
  }
}
