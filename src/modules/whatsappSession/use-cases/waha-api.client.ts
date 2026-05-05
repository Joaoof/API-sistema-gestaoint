import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WahaSession {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | string;
  me?: { id?: string; pushName?: string } | null;
}

export interface WahaQrResult {
  /** data:image/png;base64,... */
  value?: string;
  mimetype?: string;
}

export interface WahaSendResult {
  id?: string;
  timestamp?: number;
}

export interface WahaMessage {
  id?: string;
  timestamp?: number;
  from?: string;
  fromMe?: boolean;
  to?: string;
  body?: string;
  hasMedia?: boolean;
  ack?: number;
  _data?: {
    id?: { id?: string; fromMe?: boolean; remote?: string };
    pushName?: string;
    notifyName?: string;
  };
}

export interface WahaChat {
  id?: string;
  name?: string;
  isGroup?: boolean;
  timestamp?: number;
}

export interface WahaContactAvatar {
  url?: string;
  value?: string;
}

@Injectable()
export class WahaApiClient {
  private readonly logger = new Logger(WahaApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const url = this.config.get<string>('WAHA_API_URL');
    if (!url) throw new Error('WAHA_API_URL não configurada no .env.');
    return url.replace(/\/+$/, '');
  }

  private get apiKey(): string {
    const key = this.config.get<string>('WAHA_API_KEY');
    if (!key) throw new Error('WAHA_API_KEY não configurada no .env.');
    return key;
  }

  private get webhookBaseUrl(): string | null {
    return (
      this.config.get<string>('WAHA_WEBHOOK_URL') ??
      this.config.get<string>('WEBHOOK_PUBLIC_URL') ??
      null
    );
  }

  get webhookToken(): string {
    return this.config.get<string>('WAHA_WEBHOOK_TOKEN') ?? '';
  }

  /**
   * WAHA Core (free) só aceita uma única sessão chamada "default".
   * Em WAHA Plus pode-se ter várias sessões nomeadas (multi-tenant).
   * Defina WAHA_SESSION_NAME no .env ("default" para Core) para
   * sobrescrever o nome enviado nas chamadas. Sem a var, usamos o
   * instanceName por empresa (modo Plus / multi-tenant).
   */
  get sessionNameOverride(): string | null {
    const v = this.config.get<string>('WAHA_SESSION_NAME');
    return v && v.trim().length > 0 ? v.trim() : null;
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  buildWebhookUrl(sessionName: string): string | null {
    const raw = this.webhookBaseUrl;
    if (!raw) return null;
    const base = raw.trim().replace(/\/+$/, '');
    if (!base || !this.isValidHttpUrl(base)) {
      this.logger.warn(
        `WAHA_WEBHOOK_URL inválida ("${raw}"). Criando sessão SEM webhook — ` +
          `para receber mensagens em tempo real, configure uma URL HTTPS pública ` +
          `(ngrok em dev) e chame "Reconfigurar webhook" no painel.`,
      );
      return null;
    }
    const url = `${base}/api/whatsapp/webhook/${encodeURIComponent(sessionName)}`;
    if (!this.isValidHttpUrl(url)) {
      this.logger.warn(`webhookUrl construída ficou inválida: "${url}"`);
      return null;
    }
    return url;
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
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
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
      this.logger.warn(`WAHA ${method} ${path} → ${response.status}: ${message}`);
      throw new Error(`WAHA API ${response.status}: ${message.slice(0, 500)}`);
    }
    return parsed as T;
  }

  // ---------- Session ----------

  async getSession(name: string): Promise<WahaSession> {
    return this.request<WahaSession>('GET', `/api/sessions/${encodeURIComponent(name)}`);
  }

  async createSession(name: string, webhookUrl: string | null): Promise<WahaSession> {
    const webhooks =
      webhookUrl && this.isValidHttpUrl(webhookUrl)
        ? [
            {
              url: webhookUrl,
              events: ['message', 'message.ack', 'session.status'],
            },
          ]
        : [];
    return this.request<WahaSession>('POST', '/api/sessions', {
      name,
      start: true,
      config: { webhooks },
    });
  }

  async startSession(name: string): Promise<void> {
    await this.request<unknown>('POST', `/api/sessions/${encodeURIComponent(name)}/start`);
  }

  async updateSessionWebhook(name: string, webhookUrl: string): Promise<WahaSession> {
    if (!this.isValidHttpUrl(webhookUrl)) {
      throw new Error(
        `URL de webhook inválida ("${webhookUrl}"). Use uma URL HTTPS pública (ex.: ngrok em dev).`,
      );
    }
    return this.request<WahaSession>('PUT', `/api/sessions/${encodeURIComponent(name)}`, {
      config: {
        webhooks: [
          {
            url: webhookUrl,
            events: ['message', 'message.ack', 'session.status'],
          },
        ],
      },
    });
  }

  async stopSession(name: string): Promise<void> {
    await this.request<unknown>('POST', `/api/sessions/${encodeURIComponent(name)}/stop`);
  }

  async deleteSession(name: string): Promise<void> {
    await this.request<unknown>('DELETE', `/api/sessions/${encodeURIComponent(name)}`);
  }

  // ---------- Auth / QR ----------

  /**
   * O endpoint /api/{session}/auth/qr do WAHA retorna PNG binário por padrão
   * (Content-Type: image/png). Buscamos o binário e convertemos em data URL
   * pra que o front possa exibir em <img src=...> direto.
   * Se o body vier como JSON (algumas versões), aceitamos isso também.
   */
  async getQr(name: string): Promise<WahaQrResult> {
    const url = `${this.baseUrl}/api/${encodeURIComponent(name)}/auth/qr?format=image`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-Api-Key': this.apiKey, Accept: 'image/png, application/json' },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.warn(`WAHA GET /auth/qr → ${response.status}: ${text.slice(0, 200)}`);
      throw new Error(`WAHA QR ${response.status}: ${text.slice(0, 200)}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = (await response.json()) as Record<string, unknown>;
      const value =
        (json.value as string | undefined) ??
        (json.data as string | undefined) ??
        null;
      const mimetype =
        (json.mimetype as string | undefined) ?? 'image/png';
      return { value: value ?? undefined, mimetype };
    }

    // PNG (ou outro binário) — converte para data URL
    const buf = Buffer.from(await response.arrayBuffer());
    const mimetype = contentType.split(';')[0]?.trim() || 'image/png';
    return { value: `data:${mimetype};base64,${buf.toString('base64')}`, mimetype };
  }

  // ---------- Messages ----------

  async sendText(sessionName: string, chatId: string, text: string): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendText', {
      session: sessionName,
      chatId,
      text,
    });
  }

  async getMessages(
    sessionName: string,
    chatId: string,
    limit = 200,
  ): Promise<WahaMessage[]> {
    const qs = new URLSearchParams({
      chatId,
      limit: String(limit),
      downloadMedia: 'false',
    });
    const result = await this.request<WahaMessage[] | { messages?: WahaMessage[] }>(
      'GET',
      `/api/${encodeURIComponent(sessionName)}/messages?${qs}`,
    );
    return Array.isArray(result) ? result : (result?.messages ?? []);
  }

  // ---------- Chats ----------

  async getChats(sessionName: string): Promise<WahaChat[]> {
    const result = await this.request<WahaChat[] | { chats?: WahaChat[] }>(
      'GET',
      `/api/${encodeURIComponent(sessionName)}/chats`,
    );
    return Array.isArray(result) ? result : (result?.chats ?? []);
  }

  // ---------- Contacts ----------

  async getContactAvatar(
    sessionName: string,
    contactId: string,
  ): Promise<WahaContactAvatar> {
    try {
      const qs = new URLSearchParams({ contactId, session: sessionName });
      return await this.request<WahaContactAvatar>(
        'GET',
        `/api/contacts/avatar?${qs}`,
      );
    } catch (err) {
      this.logger.debug(
        `getContactAvatar falhou: ${err instanceof Error ? err.message : err}`,
      );
      return {};
    }
  }
}
