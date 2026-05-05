import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OpportunityStage } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import {
  CreateActivityInput,
  CreateOpportunityInput,
  OpportunityFilterInput,
  UpdateActivityInput,
  UpdateOpportunityInput,
} from './dto/opportunity.input';
import {
  OpportunityActivityEntity,
  OpportunityEntity,
  PipelineStageEntity,
} from './entities/opportunity.entity';
import { OpportunityUseCases } from './use-cases/opportunity.use-cases';

@Resolver(() => OpportunityEntity)
@UseGuards(GqlAuthGuard)
export class OpportunityResolver {
  constructor(
    private readonly useCases: OpportunityUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [OpportunityEntity])
  async opportunities(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: OpportunityFilterInput,
  ): Promise<OpportunityEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, filter ?? {});
  }

  @Query(() => [PipelineStageEntity])
  async pipeline(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: OpportunityFilterInput,
  ): Promise<PipelineStageEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.pipeline(companyId, filter ?? {});
  }

  @Query(() => OpportunityEntity)
  async opportunity(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<OpportunityEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => OpportunityEntity)
  async createOpportunity(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateOpportunityInput,
  ): Promise<OpportunityEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => OpportunityEntity)
  async updateOpportunity(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateOpportunityInput,
  ): Promise<OpportunityEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => OpportunityEntity)
  async moveOpportunityStage(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('stage', { type: () => OpportunityStage }) stage: OpportunityStage,
  ): Promise<OpportunityEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.moveStage({ userId: user.id!, companyId }, id, stage);
  }

  @Mutation(() => Boolean)
  async deleteOpportunity(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id!, companyId }, id);
  }

  // Activities
  @Query(() => [OpportunityActivityEntity])
  async opportunityActivities(
    @CurrentUser() user: AuthUser,
    @Args('opportunityId') opportunityId: string,
  ): Promise<OpportunityActivityEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listActivities(companyId, opportunityId);
  }

  @Mutation(() => OpportunityActivityEntity)
  async addOpportunityActivity(
    @CurrentUser() user: AuthUser,
    @Args('opportunityId') opportunityId: string,
    @Args('input') input: CreateActivityInput,
  ): Promise<OpportunityActivityEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.addActivity(
      { userId: user.id!, companyId },
      opportunityId,
      input,
    );
  }

  @Mutation(() => OpportunityActivityEntity)
  async updateOpportunityActivity(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateActivityInput,
  ): Promise<OpportunityActivityEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.updateActivity(
      { userId: user.id!, companyId },
      id,
      input,
    );
  }

  @Mutation(() => Boolean)
  async deleteOpportunityActivity(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.removeActivity({ userId: user.id!, companyId }, id);
  }
}
