import { UseGuards } from '@nestjs/common';
import { Field, Float, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { DashboardService } from './use-cases/dashboard.service';

@ObjectType()
class DailyKpi {
  @Field(() => Float) sales!: number;
  @Field(() => Float) profit!: number;
  @Field(() => Float) cost!: number;
  @Field(() => Int) ordersCount!: number;
}

@ObjectType()
class MonthlyKpi {
  @Field(() => Float) sales!: number;
  @Field(() => Float) profit!: number;
  @Field(() => Float) expenses!: number;
  @Field(() => Float) cost!: number;
}

@ObjectType()
class SalesDay {
  @Field() date!: string;
  @Field(() => Float) sales!: number;
  @Field(() => Int) orders!: number;
}

@ObjectType()
class RevExpMonth {
  @Field() month!: string;
  @Field(() => Float) revenue!: number;
  @Field(() => Float) expenses!: number;
}

@ObjectType()
class ExpenseCategory {
  @Field() category!: string;
  @Field(() => Float) amount!: number;
}

@ObjectType()
class TopProduct {
  @Field() productId!: string;
  @Field() name!: string;
  @Field(() => Int) quantity!: number;
  @Field(() => Float) revenue!: number;
}

@ObjectType()
class TopCategory {
  @Field(() => String, { nullable: true }) categoryId?: string | null;
  @Field() name!: string;
  @Field(() => Float) revenue!: number;
}

@ObjectType()
class LowStockItem {
  @Field() id!: string;
  @Field() name!: string;
  @Field(() => Int) quantity!: number;
  @Field(() => Int) minStock!: number;
}

@ObjectType()
class InventorySummary {
  @Field(() => Int) totalProducts!: number;
  @Field(() => Float) totalStockValue!: number;
  @Field(() => Int) lowStockCount!: number;
  @Field(() => [LowStockItem]) lowStockItems!: LowStockItem[];
}

@ObjectType()
class DashboardOverviewEntity {
  @Field(() => DailyKpi) daily!: DailyKpi;
  @Field(() => MonthlyKpi) monthly!: MonthlyKpi;
  @Field(() => Float) margin!: number;
  @Field(() => [SalesDay]) sales30Days!: SalesDay[];
  @Field(() => [RevExpMonth]) revenueVsExpenses6m!: RevExpMonth[];
  @Field(() => [ExpenseCategory]) expensesByCategory!: ExpenseCategory[];
  @Field(() => [TopProduct]) topProducts!: TopProduct[];
  @Field(() => [TopCategory]) topCategoriesByRevenue!: TopCategory[];
  @Field(() => InventorySummary) inventory!: InventorySummary;
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class DashboardResolver {
  constructor(
    private readonly service: DashboardService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => DashboardOverviewEntity)
  async dashboardOverview(@CurrentUser() user: User): Promise<DashboardOverviewEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.overview(companyId);
  }
}
