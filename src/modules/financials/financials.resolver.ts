import { UseGuards } from '@nestjs/common';
import { Args, Field, Float, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { FinancialsService } from './use-cases/financials.service';

@ObjectType()
class CashFlowDay {
  @Field() date!: string;
  @Field(() => Float) expectedIn!: number;
  @Field(() => Float) expectedOut!: number;
  @Field(() => Float) netForDay!: number;
  @Field(() => Float) cumulativeBalance!: number;
}

@ObjectType()
class CashFlowProjectionEntity {
  @Field(() => Float) startBalance!: number;
  @Field(() => [CashFlowDay]) days!: CashFlowDay[];
  @Field(() => Float) totalIn!: number;
  @Field(() => Float) totalOut!: number;
  @Field(() => Float) finalBalance!: number;
}

@ObjectType()
class DREMonthRow {
  @Field() month!: string;
  @Field(() => Float) revenue!: number;
  @Field(() => Float) cogs!: number;
  @Field(() => Float) grossProfit!: number;
  @Field(() => Float) expenses!: number;
  @Field(() => Float) netIncome!: number;
}

@ObjectType()
class DRETotals {
  @Field(() => Float) revenue!: number;
  @Field(() => Float) cogs!: number;
  @Field(() => Float) grossProfit!: number;
  @Field(() => Float) expenses!: number;
  @Field(() => Float) netIncome!: number;
}

@ObjectType()
class DREEntity {
  @Field() from!: string;
  @Field() to!: string;
  @Field(() => [DREMonthRow]) months!: DREMonthRow[];
  @Field(() => DRETotals) totals!: DRETotals;
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class FinancialsResolver {
  constructor(
    private readonly service: FinancialsService,
    private readonly tenancy: TenancyService,
  ) {}

  /**
   * Fluxo de caixa projetado pelos próximos N dias (default 90).
   * Considera AR/AP pendentes + RecurringBills ativas não materializadas.
   */
  @Query(() => CashFlowProjectionEntity)
  async cashFlowProjection(
    @CurrentUser() user: User,
    @Args('days', { type: () => Int, nullable: true }) days?: number,
  ): Promise<CashFlowProjectionEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.projection(companyId, days ?? 90);
  }

  /**
   * DRE gerencial mensal entre `from` (YYYY-MM) e `to` (YYYY-MM).
   * Default: últimos 12 meses incluindo o atual.
   */
  @Query(() => DREEntity)
  async dreReport(
    @CurrentUser() user: User,
    @Args('from', { nullable: true }) from?: string,
    @Args('to', { nullable: true }) to?: string,
  ): Promise<DREEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const today = new Date();
    const defaultTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const before = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const defaultFrom = `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, '0')}`;

    return this.service.dre(companyId, from ?? defaultFrom, to ?? defaultTo);
  }
}
