import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import {
  ContractFilterInput,
  CreateContractInput,
  CreateServiceLevelEventInput,
  CreateServiceLevelInput,
  UpdateContractInput,
  UpdateServiceLevelInput,
} from './dto/contract.input';
import {
  ContractEntity,
  ContractEventEntity,
  ServiceLevelEntity,
  ServiceLevelEventEntity,
} from './entities/contract.entity';
import { ContractUseCases } from './use-cases/contract.use-cases';

@Resolver(() => ContractEntity)
@UseGuards(GqlAuthGuard)
export class ContractResolver {
  constructor(
    private readonly useCases: ContractUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [ContractEntity])
  async contracts(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: ContractFilterInput,
  ): Promise<ContractEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, filter ?? {});
  }

  @Query(() => ContractEntity)
  async contract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Query(() => [ContractEventEntity])
  async contractEvents(
    @CurrentUser() user: AuthUser,
    @Args('contractId') contractId: string,
  ): Promise<ContractEventEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listContractEvents(companyId, contractId);
  }

  @Query(() => [ServiceLevelEventEntity])
  async serviceLevelEvents(
    @CurrentUser() user: AuthUser,
    @Args('serviceLevelId') serviceLevelId: string,
  ): Promise<ServiceLevelEventEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listServiceLevelEvents(companyId, serviceLevelId);
  }

  @Mutation(() => ContractEntity)
  async createContract(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateContractInput,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => ContractEntity)
  async updateContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateContractInput,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => ContractEntity)
  async activateContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.activate({ userId: user.id!, companyId }, id);
  }

  @Mutation(() => ContractEntity)
  async suspendContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.suspend(
      { userId: user.id!, companyId },
      id,
      reason ?? null,
    );
  }

  @Mutation(() => ContractEntity)
  async resumeContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.resume({ userId: user.id!, companyId }, id);
  }

  @Mutation(() => ContractEntity)
  async terminateContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.terminate(
      { userId: user.id!, companyId },
      id,
      reason ?? null,
    );
  }

  @Mutation(() => ContractEntity)
  async renewContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('newEndDate') newEndDate: Date,
  ): Promise<ContractEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.renew(
      { userId: user.id!, companyId },
      id,
      newEndDate,
    );
  }

  @Mutation(() => Boolean)
  async deleteContract(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id!, companyId }, id);
  }

  @Mutation(() => ServiceLevelEntity)
  async addServiceLevel(
    @CurrentUser() user: AuthUser,
    @Args('contractId') contractId: string,
    @Args('input') input: CreateServiceLevelInput,
  ): Promise<ServiceLevelEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.addServiceLevel(
      { userId: user.id!, companyId },
      contractId,
      input,
    );
  }

  @Mutation(() => ServiceLevelEntity)
  async updateServiceLevel(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateServiceLevelInput,
  ): Promise<ServiceLevelEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.updateServiceLevel(
      { userId: user.id!, companyId },
      id,
      input,
    );
  }

  @Mutation(() => Boolean)
  async deleteServiceLevel(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.removeServiceLevel(
      { userId: user.id!, companyId },
      id,
    );
  }

  @Mutation(() => ServiceLevelEventEntity)
  async recordServiceLevelEvent(
    @CurrentUser() user: AuthUser,
    @Args('serviceLevelId') serviceLevelId: string,
    @Args('input') input: CreateServiceLevelEventInput,
  ): Promise<ServiceLevelEventEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.recordServiceLevelEvent(
      { userId: user.id!, companyId },
      serviceLevelId,
      input,
    );
  }
}
