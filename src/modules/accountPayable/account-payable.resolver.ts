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
  registerEnumType,
} from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';

export enum AccountPayableSnoozePreset {
  PLUS_15MIN = 'PLUS_15MIN',
  PLUS_1H = 'PLUS_1H',
  TOMORROW_9H = 'TOMORROW_9H',
  PLUS_3D = 'PLUS_3D',
}
registerEnumType(AccountPayableSnoozePreset, {
  name: 'AccountPayableSnoozePreset',
  description: 'Presets de snooze pra contas a pagar (TDAH-friendly).',
});
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
    @CurrentUser() user: User,
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => AccountStatus, nullable: true })
    status?: AccountStatus,
  ): Promise<AccountPayableEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, { search, status });
  }

  @Query(() => AccountPayableEntity)
  async accountPayable(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<AccountPayableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Query(() => AccountPayableSummary)
  async accountsPayableSummary(
    @CurrentUser() user: User,
  ): Promise<AccountPayableSummary> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.summary(companyId);
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

  @Mutation(() => AccountPayableEntity, {
    description:
      'Quick-capture TDAH-friendly: cria uma conta a pagar a partir de texto livre (ex: "pagar Vivo internet 120 sexta"). A IA extrai fornecedor, valor e vencimento.',
  })
  async quickCaptureAccountPayable(
    @CurrentUser() user: User,
    @Args('text') text: string,
  ): Promise<AccountPayableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.quickCapture({ userId: user.id, companyId }, text);
  }

  @Mutation(() => AccountPayableEntity)
  async snoozeAccountPayable(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('preset', { type: () => AccountPayableSnoozePreset })
    preset: AccountPayableSnoozePreset,
  ): Promise<AccountPayableEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.snooze({ userId: user.id, companyId }, id, preset);
  }
}
