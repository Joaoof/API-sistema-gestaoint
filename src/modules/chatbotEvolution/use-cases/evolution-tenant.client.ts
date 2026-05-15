import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ModuleConfigService } from '../../featureFlag/use-cases/module-config.service';

/**
 * Cliente HTTP do Evolution API com awareness multi-tenant.
 *
 * - Lê `serverUrl` em WhatsappInstance da empresa.
 * - Lê `apiKey` decifrada em CompanyModuleOverride (módulo chatbot_evolution).
 * - Cai pra env vars EVOLUTION_API_URL/EVOLUTION_API_KEY se nada estiver
 *   configurado (compatibilidade com setup de dev / single-tenant).
 */

export type EvolutionConfig = {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
  webhookUrl: string | null;
  webhookToken: string;
};

export type EvolutionConnectionState = {
  state: 'open' | 'connecting' | 'close' | 'qrcode' | string;
  qrcode?: string | null;
  base64?: string | null;
  pairingCode?: string | null;
  number?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
};

@Injectable()
export class EvolutionTenantClient {
  private readonly logger = new Logger(EvolutionTenantClient.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly moduleConfig: ModuleConfigService,
  ) {}

  /**
   * Resolve a config Evolution efetiva para uma empresa.
   * Throws se faltar serverUrl ou apiKey após considerar fallback.
   */
  async resolveConfig(companyId: string): Promise<EvolutionConfig> {
    const [instance, decrypted] = await Promise.all([
      this.prisma.whatsappInstance.findUnique({ where: { companyId } }),
      this.moduleConfig.getDecryptedConfig(companyId, 'chatbot_evolution').catch(() => null),
    ]);

    const serverUrl =
      instance?.serverUrl?.trim() ||
      this.config.get<string>('EVOLUTION_API_URL') ||
      '';

    const apiKey =
      (decrypted?.apiKey as string | undefined)?.trim() ||
      this.config.get<string>('EVOLUTION_API_KEY') ||
      '';

    const instanceName =
      instance?.instanceName?.trim() ||
      `tenant-${companyId.slice(0, 8)}`;

    const webhookUrl =
      this.config.get<string>('EVOLUTION_WEBHOOK_URL') ??
      this.config.get<string>('WEBHOOK_PUBLIC_URL') ??
      null;

    const webhookToken =
      instance?.webhookToken ??
      this.config.get<string>('EVOLUTION_WEBHOOK_TOKEN') ??
      '';

    if (!serverUrl) {
      throw new BadRequestException(
        'Evolution serverUrl não configurado para esta empresa nem em EVOLUTION_API_URL.',
      );
    }
    if (!apiKey) {
      throw new BadRequestException(
        'Evolution apiKey não configurada — defina em chatbot_evolution.apiKey ou EVOLUTION_API_KEY.',
      );
    }

    return {
      serverUrl: serverUrl.replace(/\/+$/, ''),
      apiKey,
      instanceName,
      webhookUrl,
      webhookToken,
    };
  }

  private async request<T>(
    cfg: EvolutionConfig,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${cfg.serverUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        apikey: cfg.apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const msg =
        (typeof parsed === 'object' && parsed && 'message' in parsed
          ? (parsed as { message?: string }).message
          : null) ?? text;
      this.logger.warn(`Evolution ${method} ${path} → ${res.status} ${msg}`);
      throw new BadRequestException(
        `Evolution API erro ${res.status}: ${msg || 'desconhecido'}`,
      );
    }
    return parsed as T;
  }

  // ====================================================================
  //   Operações
  // ====================================================================

  /** Cria a instância no Evolution server (idempotente: se já existe, retorna ok). */
  async createInstance(companyId: string): Promise<{ ok: boolean; alreadyExists: boolean }> {
    const cfg = await this.resolveConfig(companyId);
    try {
      await this.request<unknown>(cfg, 'POST', '/instance/create', {
        instanceName: cfg.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        ...(cfg.webhookUrl
          ? {
              webhook: {
                url: `${cfg.webhookUrl.replace(/\/+$/, '')}/api/chatbot/evolution/${encodeURIComponent(cfg.instanceName)}/webhook`,
                webhook_by_events: false,
                events: [
                  'MESSAGES_UPSERT',
                  'CONNECTION_UPDATE',
                  'QRCODE_UPDATED',
                ],
              },
            }
          : {}),
      });
      return { ok: true, alreadyExists: false };
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (/already in use|exists|409/i.test(msg)) {
        return { ok: true, alreadyExists: true };
      }
      throw e;
    }
  }

  async fetchConnectionState(companyId: string): Promise<EvolutionConnectionState> {
    const cfg = await this.resolveConfig(companyId);
    const data = await this.request<{
      instance?: { state?: string; profilePicUrl?: string; profileName?: string };
      state?: string;
    }>(cfg, 'GET', `/instance/connectionState/${encodeURIComponent(cfg.instanceName)}`);
    const state =
      data.instance?.state ?? data.state ?? 'close';
    return {
      state,
      profileName: data.instance?.profileName ?? null,
      profilePicUrl: data.instance?.profilePicUrl ?? null,
    };
  }

  async fetchQrCode(companyId: string): Promise<EvolutionConnectionState> {
    const cfg = await this.resolveConfig(companyId);
    const data = await this.request<{
      base64?: string;
      code?: string;
      pairingCode?: string;
      qrcode?: { base64?: string; code?: string };
    }>(cfg, 'GET', `/instance/connect/${encodeURIComponent(cfg.instanceName)}`);
    const base64 = data.base64 ?? data.qrcode?.base64 ?? null;
    const code = data.code ?? data.qrcode?.code ?? null;
    return {
      state: base64 ? 'qrcode' : 'connecting',
      qrcode: code,
      base64,
      pairingCode: data.pairingCode ?? null,
    };
  }

  async logout(companyId: string): Promise<{ ok: boolean }> {
    const cfg = await this.resolveConfig(companyId);
    await this.request<unknown>(
      cfg,
      'DELETE',
      `/instance/logout/${encodeURIComponent(cfg.instanceName)}`,
    );
    return { ok: true };
  }

  async deleteInstance(companyId: string): Promise<{ ok: boolean }> {
    const cfg = await this.resolveConfig(companyId);
    await this.request<unknown>(
      cfg,
      'DELETE',
      `/instance/delete/${encodeURIComponent(cfg.instanceName)}`,
    );
    return { ok: true };
  }

  async sendText(
    companyId: string,
    to: string,
    text: string,
  ): Promise<{ ok: boolean; messageId?: string | null }> {
    const cfg = await this.resolveConfig(companyId);
    const data = await this.request<{ key?: { id?: string } }>(
      cfg,
      'POST',
      `/message/sendText/${encodeURIComponent(cfg.instanceName)}`,
      {
        number: to.replace(/\D/g, ''),
        text,
      },
    );
    return { ok: true, messageId: data?.key?.id ?? null };
  }
}
