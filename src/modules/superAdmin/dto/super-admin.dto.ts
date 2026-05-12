import { Field, Float, GraphQLISODateTime, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

// =========================================================================
// OVERVIEW (visão geral)
// =========================================================================

@ObjectType()
export class SuperAdminOverviewKpis {
  @Field(() => Int) companies!: number;
  @Field(() => Int) companiesNewThisMonth!: number;
  @Field(() => Int) users!: number;
  @Field(() => Int) usersNewThisMonth!: number;
  @Field(() => Int) pendingInvites!: number;
  @Field(() => Int) activePlans!: number;
  @Field(() => Float) aiCreditsRevenue30d!: number;
  @Field(() => Int) webhooksFailing!: number;
  @Field(() => Int) eventsToday!: number;
}

@ObjectType()
export class HealthStatus {
  @Field() service!: string;
  @Field(() => String) status!: 'ok' | 'warn' | 'down';
  @Field({ nullable: true }) detail?: string;
}

@ObjectType()
export class ActivityItem {
  @Field() id!: string;
  @Field() who!: string;
  @Field() action!: string;
  @Field({ nullable: true }) target?: string;
  @Field() at!: Date;
  @Field({ nullable: true }) companyName?: string;
}

@ObjectType()
export class GrowthPoint {
  @Field() label!: string;
  @Field(() => Int) companies!: number;
  @Field(() => Int) users!: number;
}

@ObjectType()
export class SuperAdminOverview {
  @Field(() => SuperAdminOverviewKpis) kpis!: SuperAdminOverviewKpis;
  @Field(() => [HealthStatus]) health!: HealthStatus[];
  @Field(() => [ActivityItem]) recentActivity!: ActivityItem[];
  @Field(() => [GrowthPoint]) growth30d!: GrowthPoint[];
}

// =========================================================================
// COMPANIES
// =========================================================================

@ObjectType()
export class CompanyAdminDto {
  @Field() id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) cnpj?: string | null;
  @Field(() => String, { nullable: true }) email?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) logoUrl?: string | null;
  @Field() isActive!: boolean;
  @Field(() => String, { nullable: true }) plan?: string | null;
  @Field(() => Int) usersCount!: number;
  @Field(() => Float) revenue30d!: number;
  @Field() createdAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastActivityAt?: Date | null;
}

@InputType()
export class ListCompaniesInput {
  @Field({ nullable: true }) search?: string;
  @Field(() => String, { nullable: true }) status?: 'ACTIVE' | 'SUSPENDED' | 'ALL';
  @Field(() => Int, { nullable: true }) take?: number;
  @Field(() => Int, { nullable: true }) skip?: number;
}

@InputType()
export class CreateCompanyAdminInput {
  @Field() name!: string;
  @Field({ nullable: true }) cnpj?: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) planId?: string;
  @Field({ nullable: true }) adminEmail?: string; // se passado, gera convite
}

// =========================================================================
// USERS
// =========================================================================

@ObjectType()
export class UserAdminDto {
  @Field() id!: string;
  @Field() name!: string;
  @Field() email!: string;
  @Field() role!: string;
  @Field() isActive!: boolean;
  @Field() isSuperAdmin!: boolean;
  @Field(() => String, { nullable: true }) companyId?: string | null;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field(() => String, { nullable: true }) plan?: string | null;
  @Field() createdAt!: Date;
}

@InputType()
export class ListUsersInput {
  @Field({ nullable: true }) search?: string;
  @Field({ nullable: true }) role?: string;
  @Field({ nullable: true }) companyId?: string;
  @Field(() => Int, { nullable: true }) take?: number;
  @Field(() => Int, { nullable: true }) skip?: number;
}

// =========================================================================
// PLANS & MODULES
// =========================================================================

@ObjectType()
export class ModuleAdminDto {
  @Field() id!: string;
  @Field() name!: string;
  @Field() module_key!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
}

@ObjectType()
export class PlanModuleAdminDto {
  @Field() id!: string;
  @Field() moduleId!: string;
  @Field() module_key!: string;
  @Field() moduleName!: string;
  @Field(() => [String]) permission!: string[];
  @Field() isActive!: boolean;
}

@ObjectType()
export class PlanAdminDto {
  @Field() id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field() isActive!: boolean;
  @Field() createdAt!: Date;
  @Field(() => Int) companiesCount!: number;
  @Field(() => [PlanModuleAdminDto]) modules!: PlanModuleAdminDto[];
}

@InputType()
export class CreatePlanInput {
  @Field() name!: string;
  @Field({ nullable: true }) description?: string;
}

@InputType()
export class UpsertPlanModuleInput {
  @Field() planId!: string;
  @Field() module_key!: string;
  @Field(() => [String]) permission!: string[];
}

// =========================================================================
// AI (créditos)
// =========================================================================

@ObjectType()
export class AiOverviewKpis {
  @Field(() => Float) revenue30d!: number;
  @Field(() => Int) creditsSold30d!: number;
  @Field(() => Int) conversationsToday!: number;
  @Field(() => Int) pendingPurchases!: number;
}

@ObjectType()
export class AiCompanyConsumption {
  @Field() companyId!: string;
  @Field() companyName!: string;
  @Field(() => Int) consumed30d!: number;
  @Field(() => Int) balance!: number;
}

@ObjectType()
export class AiPurchaseAdminDto {
  @Field() id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => String, { nullable: true }) userName?: string | null;
  @Field(() => Int) packageBrl!: number;
  @Field(() => Int) creditsTotal!: number;
  @Field() pixTxid!: string;
  @Field() status!: string; // PENDING | PAID | CANCELED | EXPIRED
  @Field(() => GraphQLISODateTime, { nullable: true }) paidAt?: Date | null;
  @Field() createdAt!: Date;
  @Field() expiresAt!: Date;
}

@ObjectType()
export class AiTransactionAdminDto {
  @Field() id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field() kind!: string;
  @Field(() => Int) amount!: number;
  @Field(() => Int) balanceAfter!: number;
  @Field() description!: string;
  @Field() createdAt!: Date;
}

@ObjectType()
export class AiOverview {
  @Field(() => AiOverviewKpis) kpis!: AiOverviewKpis;
  @Field(() => [AiCompanyConsumption]) topConsumers!: AiCompanyConsumption[];
}

// =========================================================================
// WEBHOOKS
// =========================================================================

@ObjectType()
export class WebhookConnectionDto {
  @Field() id!: string;
  @Field() provider!: string;
  @Field(() => String, { nullable: true }) bankId?: string | null;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field() status!: string;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastSyncAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastErrorAt?: Date | null;
  @Field(() => String, { nullable: true }) lastErrorMsg?: string | null;
  @Field(() => Int) eventsToday!: number;
  @Field() createdAt!: Date;
}

@ObjectType()
export class WebhookEventDto {
  @Field() id!: string;
  @Field() provider!: string;
  @Field() event!: string;
  @Field() processed!: boolean;
  @Field(() => String, { nullable: true }) errorMsg?: string | null;
  @Field(() => String, { nullable: true }) refType?: string | null;
  @Field(() => String, { nullable: true }) refId?: string | null;
  @Field({ nullable: true }) payloadJson?: string; // JSON.stringify(payload)
  @Field() createdAt!: Date;
}

@ObjectType()
export class WebhooksOverview {
  @Field(() => Int) connected!: number;
  @Field(() => Int) failing!: number;
  @Field(() => Int) eventsToday!: number;
  @Field(() => Float) pixInLast24h!: number;
}

// =========================================================================
// LOGS
// =========================================================================

export enum LogSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}
registerEnumType(LogSeverity, { name: 'LogSeverity' });

@ObjectType()
export class LogEntryDto {
  @Field() id!: string;
  @Field(() => LogSeverity) severity!: LogSeverity;
  @Field() action!: string;
  @Field() entity!: string;
  @Field() entityId!: string;
  @Field(() => String, { nullable: true }) companyId?: string | null;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => String, { nullable: true }) userName?: string | null;
  @Field(() => String, { nullable: true }) reason?: string | null;
  @Field() createdAt!: Date;
}

@InputType()
export class ListLogsInput {
  @Field({ nullable: true }) search?: string;
  @Field(() => LogSeverity, { nullable: true }) severity?: LogSeverity;
  @Field({ nullable: true }) companyId?: string;
  @Field({ nullable: true }) from?: Date;
  @Field({ nullable: true }) to?: Date;
  @Field(() => Int, { nullable: true }) take?: number;
  @Field(() => Int, { nullable: true }) skip?: number;
}
