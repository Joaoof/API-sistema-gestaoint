import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ModuleConfigService } from '../../featureFlag/use-cases/module-config.service';
import { EvolutionTenantClient } from './evolution-tenant.client';

export type EvolutionStatusDto = {
  configured: boolean;
  serverUrl: string | null;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  instanceName: string | null;
  status: string;
  connectionState: string | null;
  phone: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  qrCodeBase64: string | null;
  webhookUrl: string | null;
  webhookToken: string | null;
  lastError: string | null;
  lastSyncAt: Date | null;
};

@Injectable()
export class SuperAdminEvolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleConfig: ModuleConfigService,
    private readonly client: EvolutionTenantClient,
  ) {}

  /**
   * Estado consolidado da Evolution para a empresa, com hint do apiKey.
   * Não dispara nada no Evolution server — só lê o que está local.
   */
  async getStatus(companyId: string): Promise<EvolutionStatusDto> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException(`Empresa ${companyId} não existe.`);

    const [instance, publicConfig] = await Promise.all([
      this.prisma.whatsappInstance.findUnique({ where: { companyId } }),
      this.moduleConfig.getPublicConfig(companyId, 'chatbot_evolution'),
    ]);

    const apiKeyField = publicConfig.find((f) => f.key === 'apiKey');

    const webhookBase =
      process.env.EVOLUTION_WEBHOOK_URL ??
      process.env.WEBHOOK_PUBLIC_URL ??
      null;
    const webhookUrl = instance && webhookBase
      ? `${webhookBase.replace(/\/+$/, '')}/api/chatbot/evolution/${encodeURIComponent(instance.instanceName)}/webhook`
      : null;

    return {
      configured: !!(instance?.serverUrl && apiKeyField?.type === 'secret' && apiKeyField?.hasValue),
      serverUrl: instance?.serverUrl ?? null,
      hasApiKey: apiKeyField?.type === 'secret' && apiKeyField?.hasValue === true,
      apiKeyHint: apiKeyField?.type === 'secret' ? (apiKeyField.hint ?? null) : null,
      instanceName: instance?.instanceName ?? null,
      status: instance?.status ?? 'DISCONNECTED',
      connectionState: instance?.status ?? null,
      phone: instance?.phone ?? null,
      profileName: instance?.profileName ?? null,
      profilePicUrl: instance?.profilePicUrl ?? null,
      qrCodeBase64: instance?.qrCode ?? null,
      webhookUrl,
      webhookToken: instance?.webhookToken ?? null,
      lastError: instance?.lastError ?? null,
      lastSyncAt: instance?.lastSyncAt ?? null,
    };
  }

  /**
   * Persiste serverUrl, instanceName e apiKey (criptografada) pra empresa.
   * Não tenta conectar — chame `connect()` depois.
   */
  async saveConfig(input: {
    companyId: string;
    serverUrl: string;
    instanceName?: string | null;
    apiKey?: string | null;
  }): Promise<EvolutionStatusDto> {
    const company = await this.prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw new NotFoundException('Empresa não existe.');
    if (!input.serverUrl?.trim()) throw new BadRequestException('serverUrl obrigatório.');

    const desiredInstance =
      input.instanceName?.trim() || `tenant-${input.companyId.slice(0, 8)}`;

    // serverUrl + instanceName ficam em WhatsappInstance
    const existing = await this.prisma.whatsappInstance.findUnique({
      where: { companyId: input.companyId },
    });

    if (existing) {
      // Se trocou o instanceName, exigir explícito (evita perder a conexão por engano)
      await this.prisma.whatsappInstance.update({
        where: { companyId: input.companyId },
        data: {
          serverUrl: input.serverUrl.trim(),
          instanceName: desiredInstance,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.whatsappInstance.create({
        data: {
          companyId: input.companyId,
          serverUrl: input.serverUrl.trim(),
          instanceName: desiredInstance,
          webhookToken: randomBytes(24).toString('hex'),
          status: 'DISCONNECTED',
        },
      });
    }

    // apiKey vai cifrada em CompanyModuleOverride/chatbot_evolution
    if (input.apiKey !== undefined && input.apiKey !== null) {
      const payload: Record<string, unknown> = {};
      payload.apiKey = input.apiKey; // '' = apaga, string = grava cifrada
      await this.moduleConfig.setConfig(input.companyId, 'chatbot_evolution', payload);
    }

    // Garante que o módulo está habilitado pra empresa (override ON)
    await this.prisma.companyModuleOverride.upsert({
      where: {
        companyId_module_key: {
          companyId: input.companyId,
          module_key: 'chatbot_evolution',
        },
      },
      update: { enabled: true },
      create: {
        companyId: input.companyId,
        module_key: 'chatbot_evolution',
        enabled: true,
      },
    });

    return this.getStatus(input.companyId);
  }

  /**
   * Cria a instância no Evolution server e retorna QR pra escanear.
   */
  async connect(companyId: string): Promise<EvolutionStatusDto> {
    const instance = await this.prisma.whatsappInstance.findUnique({ where: { companyId } });
    if (!instance) throw new BadRequestException('Configure serverUrl/apiKey antes de conectar.');

    await this.client.createInstance(companyId);

    let qr: string | null = null;
    let stateLabel = 'CONNECTING';

    try {
      const qrRes = await this.client.fetchQrCode(companyId);
      qr = qrRes.base64 ?? null;
      if (qr) stateLabel = 'QR_PENDING';
    } catch {
      // sem QR (provavelmente já conectada)
    }

    await this.prisma.whatsappInstance.update({
      where: { companyId },
      data: {
        status: stateLabel as any,
        qrCode: qr,
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    return this.getStatus(companyId);
  }

  async refreshStatus(companyId: string): Promise<EvolutionStatusDto> {
    const instance = await this.prisma.whatsappInstance.findUnique({ where: { companyId } });
    if (!instance) return this.getStatus(companyId);

    try {
      const cs = await this.client.fetchConnectionState(companyId);
      const remoteState = (cs.state ?? '').toLowerCase();
      const label =
        remoteState === 'open' ? 'CONNECTED' :
        remoteState === 'qrcode' ? 'QR_PENDING' :
        remoteState === 'connecting' ? 'CONNECTING' :
        'DISCONNECTED';

      await this.prisma.whatsappInstance.update({
        where: { companyId },
        data: {
          status: label as any,
          profileName: cs.profileName ?? instance.profileName,
          profilePicUrl: cs.profilePicUrl ?? instance.profilePicUrl,
          lastSyncAt: new Date(),
          connectedAt: label === 'CONNECTED' && !instance.connectedAt ? new Date() : instance.connectedAt,
          lastError: null,
        },
      });
    } catch (e: any) {
      await this.prisma.whatsappInstance.update({
        where: { companyId },
        data: {
          status: 'ERROR' as any,
          lastError: (e as Error).message?.slice(0, 500) ?? null,
          lastSyncAt: new Date(),
        },
      });
    }

    return this.getStatus(companyId);
  }

  async disconnect(companyId: string): Promise<EvolutionStatusDto> {
    try {
      await this.client.logout(companyId);
    } catch { /* ignora */ }
    await this.prisma.whatsappInstance.updateMany({
      where: { companyId },
      data: { status: 'DISCONNECTED', qrCode: null },
    });
    return this.getStatus(companyId);
  }
}
