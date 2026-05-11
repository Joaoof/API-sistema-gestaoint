import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  CreateRecurringBillInput,
  UpdateRecurringBillInput,
} from './dto/recurring-bill.input';
import { RecurringBillEntity } from './entities/recurring-bill.entity';
import { RecurringBillService } from './use-cases/recurring-bill.service';

@Resolver(() => RecurringBillEntity)
@UseGuards(GqlAuthGuard)
export class RecurringBillResolver {
  constructor(
    private readonly service: RecurringBillService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [RecurringBillEntity])
  async recurringBills(@CurrentUser() user: User): Promise<RecurringBillEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.list(companyId);
  }

  @Mutation(() => RecurringBillEntity)
  async createRecurringBill(
    @CurrentUser() user: User,
    @Args('input') input: CreateRecurringBillInput,
  ): Promise<RecurringBillEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.create(companyId, input);
  }

  @Mutation(() => RecurringBillEntity)
  async updateRecurringBill(
    @CurrentUser() user: User,
    @Args('input') input: UpdateRecurringBillInput,
  ): Promise<RecurringBillEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.update(companyId, input);
  }

  @Mutation(() => Boolean)
  async deleteRecurringBill(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.remove(companyId, id);
  }

  /** Permite materializar manualmente o mês corrente (botão "Gerar agora"). */
  @Mutation(() => Int)
  materializeRecurringBills(): Promise<number> {
    return this.service.materializeMonth();
  }
}
