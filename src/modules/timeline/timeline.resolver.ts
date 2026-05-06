import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { AuthUser } from '../construction/shared/auth-user';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  TimelineCategory,
  TimelineEvent,
  TimelineEventType,
} from './entities/timeline-event.entity';
import { TimelineService } from './use-cases/timeline.service';

@Resolver(() => TimelineEvent)
@UseGuards(GqlAuthGuard)
export class TimelineResolver {
  constructor(
    private readonly service: TimelineService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [TimelineEvent], {
    description:
      'Feed unificado de novidades (vendas, contas, entregas, comunicações, alertas).',
  })
  async companyTimeline(
    @CurrentUser() user: AuthUser,
    @Args('fromDate', { nullable: true }) fromDate?: Date,
    @Args('toDate', { nullable: true }) toDate?: Date,
    @Args('types', { type: () => [TimelineEventType], nullable: true })
    types?: TimelineEventType[],
    @Args('categories', { type: () => [TimelineCategory], nullable: true })
    categories?: TimelineCategory[],
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<TimelineEvent[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.fetch(companyId, {
      fromDate,
      toDate,
      types,
      categories,
      limit,
    });
  }
}
