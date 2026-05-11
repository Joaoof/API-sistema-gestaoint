import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { PrismaService } from '../../../prisma/prisma.service';

@ObjectType()
class WebhookLogEntity {
  @Field(() => ID) id!: string;
  @Field() provider!: string;
  @Field() event!: string;
  @Field() processed!: boolean;
  @Field(() => String, { nullable: true }) errorMsg?: string | null;
  @Field(() => String, { nullable: true }) refType?: string | null;
  @Field(() => String, { nullable: true }) refId?: string | null;
  @Field() createdAt!: Date;
}

@ObjectType()
class IntegrationCredentialItem {
  @Field() key!: string;
  @Field() label!: string;
  @Field() filled!: boolean;
}

@ObjectType()
class BankIntegrationStatus {
  @Field() provider!: string; // ITAU | BB
  @Field() label!: string;
  @Field() configured!: boolean;
  @Field() environment!: string; // sandbox | production | not-set
  @Field() pixWebhookUrl!: string;
  @Field() boletoWebhookUrl!: string;
  @Field(() => Date, { nullable: true }) lastWebhookAt?: Date | null;
  @Field(() => Date, { nullable: true }) lastErrorAt?: Date | null;
  @Field(() => String, { nullable: true }) lastErrorMsg?: string | null;
  @Field(() => Int) totalWebhooks!: number;
  @Field(() => Int) processedWebhooks!: number;
  @Field(() => [IntegrationCredentialItem]) credentials!: IntegrationCredentialItem[];
  @Field(() => [WebhookLogEntity]) recentEvents!: WebhookLogEntity[];
}

const ITAU_KEYS: { key: string; label: string }[] = [
  { key: 'ITAU_CLIENT_ID', label: 'Client ID' },
  { key: 'ITAU_CLIENT_SECRET', label: 'Client Secret' },
  { key: 'ITAU_CERT_PATH', label: 'Caminho do certificado A1 (.crt)' },
  { key: 'ITAU_KEY_PATH', label: 'Caminho da chave privada (.key)' },
  { key: 'ITAU_AGENCIA', label: 'Agência (4 dígitos)' },
  { key: 'ITAU_CONTA', label: 'Conta' },
  { key: 'ITAU_CONTA_DV', label: 'Dígito verificador' },
];

const BB_KEYS: { key: string; label: string }[] = [
  { key: 'BB_CLIENT_ID', label: 'Client ID' },
  { key: 'BB_CLIENT_SECRET', label: 'Client Secret' },
  { key: 'BB_DEV_APP_KEY', label: 'Developer App Key (gw-dev-app-key)' },
  { key: 'BB_AGENCIA', label: 'Agência' },
  { key: 'BB_CONTA', label: 'Conta' },
  { key: 'BB_CONVENIO', label: 'Convênio de cobrança' },
];

@Resolver()
@UseGuards(GqlAuthGuard)
export class BankIntegrationsResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [BankIntegrationStatus])
  async bankIntegrationsStatus(): Promise<BankIntegrationStatus[]> {
    const baseUrl = process.env.PUBLIC_API_URL ?? 'https://SEU_HOST';
    return Promise.all([
      this.buildStatus('ITAU', 'Itaú', ITAU_KEYS, baseUrl, 'ITAU_ENV'),
      this.buildStatus('BB', 'Banco do Brasil', BB_KEYS, baseUrl, 'BB_ENV'),
    ]);
  }

  private async buildStatus(
    provider: 'ITAU' | 'BB',
    label: string,
    keys: { key: string; label: string }[],
    baseUrl: string,
    envKey: string,
  ): Promise<BankIntegrationStatus> {
    const credentials = keys.map((k) => ({
      key: k.key,
      label: k.label,
      filled: !!process.env[k.key],
    }));
    const configured = credentials.every((c) => c.filled);

    const pixProvider = `${provider}_PIX`;
    const boletoProvider = `${provider}_BOLETO`;

    const [agg, lastError, recentEvents] = await Promise.all([
      this.prisma.webhookLog.groupBy({
        by: ['processed'],
        where: { provider: { in: [pixProvider, boletoProvider] } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      this.prisma.webhookLog.findFirst({
        where: {
          provider: { in: [pixProvider, boletoProvider] },
          processed: false,
          errorMsg: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookLog.findMany({
        where: { provider: { in: [pixProvider, boletoProvider] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    let total = 0;
    let processed = 0;
    let lastWebhookAt: Date | null = null;
    for (const a of agg) {
      total += a._count._all;
      if (a.processed) processed += a._count._all;
      if (a._max.createdAt && (!lastWebhookAt || a._max.createdAt > lastWebhookAt)) {
        lastWebhookAt = a._max.createdAt;
      }
    }

    return {
      provider,
      label,
      configured,
      environment: process.env[envKey] ?? 'not-set',
      pixWebhookUrl: `${baseUrl}/api/webhooks/pix/${provider.toLowerCase()}`,
      boletoWebhookUrl: `${baseUrl}/api/webhooks/boleto/${provider.toLowerCase()}`,
      lastWebhookAt,
      lastErrorAt: lastError?.createdAt ?? null,
      lastErrorMsg: lastError?.errorMsg ?? null,
      totalWebhooks: total,
      processedWebhooks: processed,
      credentials,
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        provider: e.provider,
        event: e.event,
        processed: e.processed,
        errorMsg: e.errorMsg,
        refType: e.refType,
        refId: e.refId,
        createdAt: e.createdAt,
      })),
    };
  }
}
