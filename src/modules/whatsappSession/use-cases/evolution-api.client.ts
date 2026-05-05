import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EvolutionInstance {
  instanceName: string;
  apikey?: string;
  status?: string;
  serverUrl?: string;
}

export interface EvolutionConnectionState {
  instance?: { instanceName?: string; state?: string };
  state?: string;
}

export interface EvolutionQrResult {
  qrcode?: string;
  base64?: string;
  code?: string;
  pairingCode?: string;
}

export interface EvolutionSendTextResult {
  key?: { id?: string; remoteJid?: string };
  status?: string;
  messageTimestamp?: number | string;
}

@Injectable()
export class EvolutionApiClient {
  private readonly logger = new Logger(EvolutionApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const url = this.config.get<string>('EVOLUTION_API_URL');
    if (!url) {
      throw new Error('EVOLUTION_API_URL não configurada no .env.');
    }
    return url.replace(/\/+$/, '');
  }

  private get apiKey(): string {
    const key = this.config.get<string>('EVOLUTION_API_KEY');
    if (!key) {
      throw new Error('EVOLUTION_API_KEY não configurada no .env.');
    }
    return key;
  }

  private get webhookUrl(): string | null {
    return (
      this.config.get<string>('EVOLUTION_WEBHOOK_URL') ??
      this.config.get<string>('WEBHOOK_PUBLIC_URL') ??
      null
    );
  }

  get webhookToken(): string {
    return this.config.get<string>('EVOLUTION_WEBHOOK_TOKEN') ?? '';
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!response.ok) {
      const message =
        typeof parsed === 'object' && parsed !== null
          ? JSON.stringify(parsed)
          : String(parsed);
      this.logger.warn(
        `Evolution ${method} ${path} → ${response.status}: ${message}`,
      );
      throw new Error(
        `Evolution API ${response.status}: ${message.slice(0, 500)}`,
      );
    }
    return parsed as T;
  }

  buildWebhookUrl(instanceName: string): string | null {
    const base = this.webhookUrl;
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/api/whatsapp/webhook/${instanceName}`;
  }

  async createInstance(instanceName: string): Promise<EvolutionInstance> {
    return this.request<EvolutionInstance>('POST', '/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
  }

  /**
   * Configura webhook em endpoint dedicado — mais confiável que junto do create.
   * Tenta os 3 formatos das versões mais comuns do Evolution.
   */
  async setWebhook(
    instanceName: string,
  ): Promise<{ ok: boolean; tried: string[]; format?: string }> {
    const url = this.buildWebhookUrl(instanceName);
    if (!url) {
      throw new Error(
        'EVOLUTION_WEBHOOK_URL não configurada — webhook não pode ser registrado.',
      );
    }
    const events = [
      'CONNECTION_UPDATE',
      'QRCODE_UPDATED',
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
    ];

    const variants: Array<{ shape: string; body: Record<string, unknown> }> = [
      {
        shape: 'v2-nested',
        body: {
          webhook: {
            enabled: true,
            url,
            events,
            webhook_by_events: false,
            webhookByEvents: false,
            byEvents: false,
          },
        },
      },
      {
        shape: 'v2-flat',
        body: { url, enabled: true, events, webhookByEvents: false },
      },
      { shape: 'v1', body: { url, events, webhook_by_events: false } },
    ];

    const tried: string[] = [];
    let lastErr: unknown = null;
    for (const v of variants) {
      try {
        await this.request<unknown>(
          'POST',
          `/webhook/set/${encodeURIComponent(instanceName)}`,
          v.body,
        );
        this.logger.log(
          `Webhook configurado em ${instanceName} (formato: ${v.shape}) → ${url}`,
        );
        return { ok: true, tried: [...tried, v.shape], format: v.shape };
      } catch (err) {
        tried.push(v.shape);
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Formato ${v.shape} falhou: ${msg.slice(0, 200)}`);
      }
    }
    throw new Error(
      `Falha ao configurar webhook em todos os formatos. Último erro: ${
        lastErr instanceof Error ? lastErr.message : String(lastErr)
      }`,
    );
  }

  async getWebhookConfig(instanceName: string): Promise<unknown> {
    return this.request<unknown>(
      'GET',
      `/webhook/find/${encodeURIComponent(instanceName)}`,
    );
  }

  async findChats(instanceName: string): Promise<unknown> {
    try {
      return await this.request<unknown>(
        'POST',
        `/chat/findChats/${encodeURIComponent(instanceName)}`,
        {},
      );
    } catch {
      return this.request<unknown>(
        'GET',
        `/chat/findChats/${encodeURIComponent(instanceName)}`,
      );
    }
  }

  async fetchInstances(instanceName: string): Promise<EvolutionInstance[]> {
    return this.request<EvolutionInstance[]>(
      'GET',
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
    );
  }

  async connectInstance(instanceName: string): Promise<EvolutionQrResult> {
    return this.request<EvolutionQrResult>(
      'GET',
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );
  }

  async connectionState(
    instanceName: string,
  ): Promise<EvolutionConnectionState> {
    return this.request<EvolutionConnectionState>(
      'GET',
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
  }

  async logoutInstance(instanceName: string): Promise<unknown> {
    return this.request<unknown>(
      'DELETE',
      `/instance/logout/${encodeURIComponent(instanceName)}`,
    );
  }

  async deleteInstance(instanceName: string): Promise<unknown> {
    return this.request<unknown>(
      'DELETE',
      `/instance/delete/${encodeURIComponent(instanceName)}`,
    );
  }

  async sendText(
    instanceName: string,
    toNumber: string,
    text: string,
  ): Promise<EvolutionSendTextResult> {
    const path = `/message/sendText/${encodeURIComponent(instanceName)}`;
    const variants: Array<{ shape: string; body: Record<string, unknown> }> = [
      // Evolution v2.x — formato mais comum
      { shape: 'v2-flat', body: { number: toNumber, text } },
      // Evolution v2.x com options
      {
        shape: 'v2-options',
        body: {
          number: toNumber,
          text,
          options: { delay: 1000, presence: 'composing' },
        },
      },
      // Evolution v1.x
      {
        shape: 'v1',
        body: {
          number: toNumber,
          options: { delay: 1000 },
          textMessage: { text },
        },
      },
    ];

    let lastErr: unknown = null;
    for (const v of variants) {
      try {
        const result = await this.request<EvolutionSendTextResult>(
          'POST',
          path,
          v.body,
        );
        this.logger.debug(
          `sendText OK em ${instanceName} (formato: ${v.shape})`,
        );
        return result;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        // Se o erro é 401/403/404 não vale a pena tentar outros formatos
        if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
          throw err;
        }
      }
    }
    throw new Error(
      `Falha ao enviar texto: ${
        lastErr instanceof Error ? lastErr.message : String(lastErr)
      }`,
    );
  }
}
