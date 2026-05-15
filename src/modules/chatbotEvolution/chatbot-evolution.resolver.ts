import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';
import {
  CreateEvolutionFlowInput,
  EvolutionFlowGqlDto,
  EvolutionStatusGqlDto,
  SaveEvolutionConfigInput,
  UpdateEvolutionFlowInput,
} from './dto/evolution.dto';
import { SuperAdminEvolutionService } from './use-cases/super-admin-evolution.service';
import { SuperAdminEvolutionFlowsService } from './use-cases/super-admin-evolution-flows.service';

@Resolver()
@UseGuards(GqlAuthGuard, SuperAdminGuard)
export class ChatbotEvolutionResolver {
  constructor(
    private readonly evolution: SuperAdminEvolutionService,
    private readonly flows: SuperAdminEvolutionFlowsService,
  ) {}

  // ============== Status / Conexão ==============

  @Query(() => EvolutionStatusGqlDto, { name: 'superAdminEvolutionStatus' })
  async status(@Args('companyId') companyId: string): Promise<EvolutionStatusGqlDto> {
    return this.evolution.getStatus(companyId) as Promise<EvolutionStatusGqlDto>;
  }

  @Mutation(() => EvolutionStatusGqlDto, { name: 'superAdminSaveEvolutionConfig' })
  async saveConfig(@Args('input') input: SaveEvolutionConfigInput): Promise<EvolutionStatusGqlDto> {
    return this.evolution.saveConfig({
      companyId: input.companyId,
      serverUrl: input.serverUrl,
      instanceName: input.instanceName ?? null,
      apiKey: input.apiKey ?? null,
    }) as Promise<EvolutionStatusGqlDto>;
  }

  @Mutation(() => EvolutionStatusGqlDto, { name: 'superAdminEvolutionConnect' })
  async connect(@Args('companyId') companyId: string): Promise<EvolutionStatusGqlDto> {
    return this.evolution.connect(companyId) as Promise<EvolutionStatusGqlDto>;
  }

  @Mutation(() => EvolutionStatusGqlDto, { name: 'superAdminEvolutionRefreshStatus' })
  async refresh(@Args('companyId') companyId: string): Promise<EvolutionStatusGqlDto> {
    return this.evolution.refreshStatus(companyId) as Promise<EvolutionStatusGqlDto>;
  }

  @Mutation(() => EvolutionStatusGqlDto, { name: 'superAdminEvolutionDisconnect' })
  async disconnect(@Args('companyId') companyId: string): Promise<EvolutionStatusGqlDto> {
    return this.evolution.disconnect(companyId) as Promise<EvolutionStatusGqlDto>;
  }

  // ============== Regras (flows) ==============

  @Query(() => [EvolutionFlowGqlDto], { name: 'superAdminEvolutionFlows' })
  async listFlows(@Args('companyId') companyId: string): Promise<EvolutionFlowGqlDto[]> {
    return this.flows.list(companyId) as Promise<EvolutionFlowGqlDto[]>;
  }

  @Mutation(() => EvolutionFlowGqlDto, { name: 'superAdminCreateEvolutionFlow' })
  async createFlow(@Args('input') input: CreateEvolutionFlowInput): Promise<EvolutionFlowGqlDto> {
    return this.flows.create(input) as Promise<EvolutionFlowGqlDto>;
  }

  @Mutation(() => EvolutionFlowGqlDto, { name: 'superAdminUpdateEvolutionFlow' })
  async updateFlow(@Args('input') input: UpdateEvolutionFlowInput): Promise<EvolutionFlowGqlDto> {
    const { companyId, id, ...patch } = input;
    return this.flows.update(companyId, id, patch) as Promise<EvolutionFlowGqlDto>;
  }

  @Mutation(() => Boolean, { name: 'superAdminDeleteEvolutionFlow' })
  async deleteFlow(
    @Args('companyId') companyId: string,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.flows.remove(companyId, id);
  }
}
