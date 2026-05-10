import { UseGuards } from '@nestjs/common';
import { Args, Field, ID, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { InsightsService } from './use-cases/insights.service';

@ObjectType()
export class InsightEntity {
  @Field(() => ID) id!: string;
  @Field() kind!: string;
  @Field() title!: string;
  @Field() body!: string;
  @Field() generatedByModel!: string;
  @Field(() => Int) creditsCost!: number;
  @Field(() => [String]) deliveredChannels!: string[];
  @Field() createdAt!: Date;
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class InsightsResolver {
  constructor(
    private readonly service: InsightsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [InsightEntity])
  async insights(
    @CurrentUser() user: User,
    @Args('kind', { nullable: true }) kind?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<InsightEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.listLatest(companyId, kind, limit);
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      generatedByModel: r.generatedByModel,
      creditsCost: r.creditsCost,
      deliveredChannels: r.deliveredChannels,
      createdAt: r.createdAt,
    }));
  }

  /** Permite gerar manualmente (botão "Gerar agora" no console). */
  @Mutation(() => InsightEntity)
  async generateInsightNow(@CurrentUser() user: User): Promise<InsightEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const r = await this.service.generate(companyId, 'MANUAL');
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      generatedByModel: r.generatedByModel,
      creditsCost: r.creditsCost,
      deliveredChannels: r.deliveredChannels,
      createdAt: r.createdAt,
    };
  }
}
