import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CreateBankInput, UpdateBankInput } from './dto/create-bank.input';
import { BankEntity } from './entities/bank.entity';
import { BankUseCases } from './use-cases/bank.use-cases';

@Resolver(() => BankEntity)
@UseGuards(GqlAuthGuard)
export class BankResolver {
  constructor(
    private readonly useCases: BankUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [BankEntity])
  async banks(
    @CurrentUser() user: User,
    @Args('search', { nullable: true }) search?: string,
    @Args('activeOnly', { nullable: true }) activeOnly?: boolean,
  ): Promise<BankEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, { search, activeOnly });
  }

  @Query(() => BankEntity)
  async bank(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<BankEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => BankEntity)
  async createBank(
    @CurrentUser() user: User,
    @Args('input') input: CreateBankInput,
  ): Promise<BankEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id, companyId }, input);
  }

  @Mutation(() => BankEntity)
  async updateBank(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateBankInput,
  ): Promise<BankEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id, companyId }, id, input);
  }

  @Mutation(() => Boolean)
  async deleteBank(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id, companyId }, id);
  }
}
