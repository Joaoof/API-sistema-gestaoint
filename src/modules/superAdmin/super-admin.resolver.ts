import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import {
  // Overview
  SuperAdminOverview,
  // Companies
  CompanyAdminDto, CreateCompanyAdminInput, ListCompaniesInput,
  // Users
  UserAdminDto, ListUsersInput,
  // Plans
  PlanAdminDto, ModuleAdminDto, CreatePlanInput, UpsertPlanModuleInput,
  // AI
  AiOverview, AiPurchaseAdminDto, AiTransactionAdminDto,
  // Webhooks
  WebhookConnectionDto, WebhookEventDto, WebhooksOverview,
  // Logs
  LogEntryDto, ListLogsInput,
} from './dto/super-admin.dto';
import { SuperAdminMetricsService } from './use-cases/super-admin-metrics.service';
import { SuperAdminCompaniesService } from './use-cases/super-admin-companies.service';
import { SuperAdminUsersService } from './use-cases/super-admin-users.service';
import { SuperAdminPlansService } from './use-cases/super-admin-plans.service';
import { SuperAdminAiService } from './use-cases/super-admin-ai.service';
import { SuperAdminWebhooksService } from './use-cases/super-admin-webhooks.service';
import { SuperAdminLogsService } from './use-cases/super-admin-logs.service';

@Resolver()
@UseGuards(GqlAuthGuard, SuperAdminGuard)
export class SuperAdminResolver {
  constructor(
    private readonly metrics: SuperAdminMetricsService,
    private readonly companies: SuperAdminCompaniesService,
    private readonly users: SuperAdminUsersService,
    private readonly plans: SuperAdminPlansService,
    private readonly ai: SuperAdminAiService,
    private readonly webhooks: SuperAdminWebhooksService,
    private readonly logs: SuperAdminLogsService,
  ) {}

  // -----------------------------------------------------------------------
  // OVERVIEW
  // -----------------------------------------------------------------------
  @Query(() => SuperAdminOverview, { name: 'superAdminOverview' })
  overview() {
    return this.metrics.getOverview();
  }

  // -----------------------------------------------------------------------
  // COMPANIES
  // -----------------------------------------------------------------------
  @Query(() => [CompanyAdminDto], { name: 'superAdminCompanies' })
  listCompanies(@Args('input', { nullable: true }) input?: ListCompaniesInput) {
    return this.companies.list(input);
  }

  @Mutation(() => CompanyAdminDto, { name: 'superAdminCreateCompany' })
  async createCompany(
    @CurrentUser() user: User,
    @Args('input') input: CreateCompanyAdminInput,
  ): Promise<CompanyAdminDto> {
    const created = await this.companies.create(user.id, input);
    const list = await this.companies.list({ search: created.name });
    return list[0] ?? {
      id: created.id, name: created.name, cnpj: created.cnpj, email: created.email,
      phone: created.phone, logoUrl: created.logoUrl, isActive: created.is_active ?? true,
      plan: null, usersCount: 0, revenue30d: 0, createdAt: created.createdAt, lastActivityAt: null,
    };
  }

  @Mutation(() => Boolean, { name: 'superAdminSetCompanyActive' })
  async setCompanyActive(
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
  ) {
    await this.companies.setActive(id, isActive);
    return true;
  }

  // -----------------------------------------------------------------------
  // USERS
  // -----------------------------------------------------------------------
  @Query(() => [UserAdminDto], { name: 'superAdminUsers' })
  listUsers(@Args('input', { nullable: true }) input?: ListUsersInput) {
    return this.users.list(input);
  }

  @Mutation(() => Boolean, { name: 'superAdminSetUserActive' })
  async setUserActive(
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
  ) {
    await this.users.setActive(id, isActive);
    return true;
  }

  // -----------------------------------------------------------------------
  // PLANS & MODULES
  // -----------------------------------------------------------------------
  @Query(() => [PlanAdminDto], { name: 'superAdminPlans' })
  listPlans() {
    return this.plans.listPlans();
  }

  @Query(() => [ModuleAdminDto], { name: 'superAdminModules' })
  listModules() {
    return this.plans.listModules();
  }

  @Mutation(() => PlanAdminDto, { name: 'superAdminCreatePlan' })
  async createPlan(@Args('input') input: CreatePlanInput): Promise<PlanAdminDto> {
    const created = await this.plans.createPlan(input);
    const all = await this.plans.listPlans();
    return all.find((p) => p.id === created.id) ?? {
      id: created.id, name: created.name, description: created.description,
      isActive: created.isActive, createdAt: created.createdAt, companiesCount: 0, modules: [],
    };
  }

  @Mutation(() => Boolean, { name: 'superAdminSetPlanActive' })
  async setPlanActive(
    @Args('planId', { type: () => ID }) planId: string,
    @Args('isActive') isActive: boolean,
  ) {
    await this.plans.setActive(planId, isActive);
    return true;
  }

  @Mutation(() => Boolean, { name: 'superAdminDeletePlan' })
  async deletePlan(@Args('planId', { type: () => ID }) planId: string) {
    await this.plans.deletePlan(planId);
    return true;
  }

  @Mutation(() => Boolean, { name: 'superAdminUpsertPlanModule' })
  async upsertPlanModule(@Args('input') input: UpsertPlanModuleInput) {
    await this.plans.upsertPlanModule(input);
    return true;
  }

  // -----------------------------------------------------------------------
  // AI
  // -----------------------------------------------------------------------
  @Query(() => AiOverview, { name: 'superAdminAiOverview' })
  aiOverview() {
    return this.ai.overview();
  }

  @Query(() => [AiPurchaseAdminDto], { name: 'superAdminAiPurchases' })
  aiPurchases(
    @Args('status', { nullable: true }) status?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
  ) {
    return this.ai.listPurchases({ status, take });
  }

  @Query(() => [AiTransactionAdminDto], { name: 'superAdminAiTransactions' })
  aiTransactions(@Args('take', { type: () => Int, nullable: true }) take?: number) {
    return this.ai.listTransactions({ take });
  }

  @Mutation(() => Boolean, { name: 'superAdminConfirmAiPurchase' })
  async confirmAiPurchase(
    @CurrentUser() user: User,
    @Args('purchaseId', { type: () => ID }) purchaseId: string,
  ) {
    await this.ai.confirmPurchase(purchaseId, user.id);
    return true;
  }

  // -----------------------------------------------------------------------
  // WEBHOOKS
  // -----------------------------------------------------------------------
  @Query(() => WebhooksOverview, { name: 'superAdminWebhooksOverview' })
  webhooksOverview() {
    return this.webhooks.overview();
  }

  @Query(() => [WebhookConnectionDto], { name: 'superAdminWebhookConnections' })
  webhookConnections() {
    return this.webhooks.listConnections();
  }

  @Query(() => [WebhookEventDto], { name: 'superAdminWebhookEvents' })
  webhookEvents(
    @Args('provider', { nullable: true }) provider?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
  ) {
    return this.webhooks.listEvents({ provider, take });
  }

  // -----------------------------------------------------------------------
  // LOGS
  // -----------------------------------------------------------------------
  @Query(() => [LogEntryDto], { name: 'superAdminLogs' })
  listLogs(@Args('input', { nullable: true }) input?: ListLogsInput) {
    return this.logs.list(input);
  }
}
