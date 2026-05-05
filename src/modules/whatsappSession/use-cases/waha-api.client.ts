import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WahaSession {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | string;
  me?: { id?: string; pushName?: string } | null;
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

/**
 * Forma normalizada de um chat (já com JID extraído + nome resolvido pelo WAHA).
 * O WAHA WEBJS retorna `id` como objeto `{ server, user, _serialized }` e o
 * `name` já vem com telefone formatado quando o contato está na agenda do
 * aparelho. Em LIDs, o `name` traz o telefone real resolvido pelo WAHA.
 */
export interface WahaChat {
  id?: string;
  name?: string;
  isGroup?: boolean;
  isReadOnly?: boolean;
  unreadCount?: number;
  timestamp?: number;
  lastMessageBody?: string;
}

interface WahaChatRaw {
  id?: string | { _serialized?: string };
  name?: string;
  isGroup?: boolean;
  isReadOnly?: boolean;
  unreadCount?: number;
  timestamp?: number;
  lastMessage?: {
    body?: string;
    caption?: string;
    _data?: { body?: string; caption?: string };
  };
}

export interface WahaContactAvatar {
  url?: string;
  value?: string;
  profilePictureURL?: string;
}

export interface WahaContact {
  id?: string;
  number?: string;
  name?: string;
  pushname?: string;
  shortName?: string;
  isMe?: boolean;
  isUser?: boolean;
  isGroup?: boolean;
  isWAContact?: boolean;
  isMyContact?: boolean;
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
    const result = await this.request<WahaChatRaw[] | { chats?: WahaChatRaw[] }>(
      'GET',
      `/api/${encodeURIComponent(sessionName)}/chats`,
    );
    const raw = Array.isArray(result) ? result : (result?.chats ?? []);
    return raw.map((c) => {
      const id =
        typeof c.id === 'string'
          ? c.id
          : c.id?._serialized ?? '';
      const lastMessageBody =
        c.lastMessage?.body ??
        c.lastMessage?.caption ??
        c.lastMessage?._data?.body ??
        c.lastMessage?._data?.caption;
      return {
        id,
        name: c.name,
        isGroup: c.isGroup,
        isReadOnly: c.isReadOnly,
        unreadCount: c.unreadCount,
        timestamp: c.timestamp,
        lastMessageBody,
      };
    });
  }

  // ---------- Contacts ----------

  /**
   * Lista todos os contatos resolvidos pela sessão WAHA — equivale ao que o
   * dashboard do WAHA mostra na tela de chats. Aceita LID com telefone real
   * quando o contato está salvo no aparelho conectado.
   *
   * Tenta dois formatos de URL: path-prefix (`/api/{session}/contacts/all`,
   * versões mais novas do WAHA Plus) e query-param (`/api/contacts/all?session=…`,
   * formato legado). Cai pro segundo se o primeiro retornar 404.
   */
  async getContacts(sessionName: string): Promise<WahaContact[]> {
    const candidates = [
      `/api/${encodeURIComponent(sessionName)}/contacts/all`,
      `/api/contacts/all?${new URLSearchParams({ session: sessionName })}`,
    ];
    for (const path of candidates) {
      try {
        const result = await this.request<WahaContact[] | { contacts?: WahaContact[] }>(
          'GET',
          path,
        );
        const list = Array.isArray(result) ? result : (result?.contacts ?? []);
        this.logger.log(
          `getContacts: ${list.length} contato(s) via ${path}`,
        );
        return list;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // 404 → tenta o próximo formato. Outros erros: idem, mas loga warn.
        if (!message.includes('404')) {
          this.logger.warn(`getContacts ${path} falhou: ${message}`);
        }
      }
    }
    this.logger.warn(
      `getContacts: nenhum endpoint /contacts/all respondeu (sessão ${sessionName})`,
    );
    return [];
  }

  async getContactAvatar(
    sessionName: string,
    contactId: string,
  ): Promise<WahaContactAvatar> {
    const qs = new URLSearchParams({ contactId, session: sessionName });
    const candidates = [
      `/api/contacts/profile-picture?${qs}`,
      `/api/contacts/avatar?${qs}`,
    ];
    for (const path of candidates) {
      try {
        const res = await this.request<WahaContactAvatar>('GET', path);
        const url = res?.profilePictureURL ?? res?.url ?? res?.value ?? null;
        if (url) return { url, profilePictureURL: url };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('404')) {
          this.logger.debug(`getContactAvatar ${path}: ${message}`);
        }
      }
    }
    return {};
  }
}
