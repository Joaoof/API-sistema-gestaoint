import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import {
  CreateRecurringBillInput,
  UpdateRecurringBillInput,
} from './dto/recurring-bill.input';
import { RecurringBillEntity } from './entities/recurring-bill.entity';
import { RecurringBillService } from './use-cases/recurring-bill.service';

@Resolver(() => RecurringBillEntity)
@UseGuards(GqlAuthGuard)
export class RecurringBillResolver {
  constructor(private readonly service: RecurringBillService) {}

  @Query(() => [RecurringBillEntity])
  recurringBills(): Promise<RecurringBillEntity[]> {
    return this.service.list();
  }

  @Mutation(() => RecurringBillEntity)
  createRecurringBill(
    @Args('input') input: CreateRecurringBillInput,
  ): Promise<RecurringBillEntity> {
    return this.service.create(input);
  }

  @Mutation(() => RecurringBillEntity)
  updateRecurringBill(
    @Args('input') input: UpdateRecurringBillInput,
  ): Promise<RecurringBillEntity> {
    return this.service.update(input);
  }

  @Mutation(() => Boolean)
  deleteRecurringBill(@Args('id') id: string): Promise<boolean> {
    return this.service.remove(id);
  }

  /** Permite materializar manualmente o mês corrente (botão "Gerar agora"). */
  @Mutation(() => Int)
  materializeRecurringBills(): Promise<number> {
    return this.service.materializeMonth();
  }
}
