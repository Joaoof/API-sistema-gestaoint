import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WahaSession {
  name: string;
  status:
    | 'STOPPED'
    | 'STARTING'
    | 'SCAN_QR_CODE'
    | 'WORKING'
    | 'FAILED'
    | string;
  me?: { id?: string; pushName?: string } | null;
}

export interface WahaSendResult {
  id?:
    | string
    | {
        fromMe?: boolean;
        remote?: string;
        id?: string;
        _serialized?: string;
      };
  timestamp?: number;
}

/**
 * WAHA WEBJS retorna `result.id` como objeto pra mensagens enviadas a LIDs
 * (`{fromMe, remote, id, _serialized}`); pra DMs comuns devolve string.
 * Normaliza pros dois casos. O id usado pra ack/edit/delete é o `.id` interno.
 */
export function extractExternalId(
  result: WahaSendResult | null | undefined,
): string | null {
  const raw = result?.id;
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  return raw.id ?? raw._serialized ?? null;
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
  /** /chats/overview retorna `picture` direto sem precisar de chamada extra */
  picture?: string | null;
  lastMessageId?: string | null;
  lastMessageFromMe?: boolean;
}

export interface WahaPresence {
  chatId?: string;
  presence?: 'online' | 'offline' | 'typing' | 'recording' | 'paused';
  lastSeen?: number | null;
  participants?: {
    id: string;
    lastKnownPresence?: string;
    lastSeen?: number;
  }[];
}

export interface WahaCheckExists {
  numberExists?: boolean;
  chatId?: string;
}

export interface WahaContactAbout {
  about?: string | null;
}

export interface WahaGroupParticipant {
  id?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

interface WahaChatRaw {
  id?: string | { _serialized?: string };
  name?: string;
  isGroup?: boolean;
  isReadOnly?: boolean;
  unreadCount?: number;
  timestamp?: number;
  picture?: string | null;
  lastMessage?: {
    id?: string | { id?: string };
    fromMe?: boolean;
    body?: string;
    caption?: string;
    timestamp?: number;
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
      this.logger.warn(
        `WAHA ${method} ${path} → ${response.status}: ${message}`,
      );
      throw new Error(`WAHA API ${response.status}: ${message.slice(0, 500)}`);
    }
    return parsed as T;
  }

  // ---------- Session ----------

  async getSession(name: string): Promise<WahaSession> {
    return this.request<WahaSession>(
      'GET',
      `/api/sessions/${encodeURIComponent(name)}`,
    );
  }

  async updateSessionWebhook(
    name: string,
    webhookUrl: string,
  ): Promise<WahaSession> {
    if (!this.isValidHttpUrl(webhookUrl)) {
      throw new Error(
        `URL de webhook inválida ("${webhookUrl}"). Use uma URL HTTPS pública (ex.: ngrok em dev).`,
      );
    }
    return this.request<WahaSession>(
      'PUT',
      `/api/sessions/${encodeURIComponent(name)}`,
      {
        config: {
          webhooks: [
            {
              url: webhookUrl,
              events: [
                'message',
                'message.any',
                'message.ack',
                'message.reaction',
                'message.revoked',
                'message.edited',
                'presence.update',
                'session.status',
                'group.v2.join',
                'group.v2.leave',
                'group.v2.participants',
                'group.v2.update',
                'chat.archive',
              ],
            },
          ],
        },
      },
    );
  }

  // ---------- Messages ----------

  async sendText(
    sessionName: string,
    chatId: string,
    text: string,
  ): Promise<WahaSendResult> {
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
    const result = await this.request<
      WahaMessage[] | { messages?: WahaMessage[] }
    >('GET', `/api/${encodeURIComponent(sessionName)}/messages?${qs}`);
    return Array.isArray(result) ? result : (result?.messages ?? []);
  }

  // ---------- Chats ----------

  async getChats(sessionName: string): Promise<WahaChat[]> {
    const result = await this.request<
      WahaChatRaw[] | { chats?: WahaChatRaw[] }
    >('GET', `/api/${encodeURIComponent(sessionName)}/chats`);
    const raw = Array.isArray(result) ? result : (result?.chats ?? []);
    return raw.map((c) => this.normalizeChat(c));
  }

  /**
   * Endpoint preferido para a UI de conversas — retorna chats já com picture,
   * última mensagem e unreadCount em uma só chamada (estilo painel WAHA).
   * Cai pra `getChats` se não existir.
   */
  async getChatsOverview(
    sessionName: string,
    limit = 50,
    offset = 0,
  ): Promise<WahaChat[]> {
    const qs = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    try {
      const result = await this.request<
        WahaChatRaw[] | { chats?: WahaChatRaw[] }
      >('GET', `/api/${encodeURIComponent(sessionName)}/chats/overview?${qs}`);
      const raw = Array.isArray(result) ? result : (result?.chats ?? []);
      return raw.map((c) => this.normalizeChat(c));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('404')) {
        this.logger.debug('chats/overview indisponível, fallback /chats');
        return this.getChats(sessionName);
      }
      throw err;
    }
  }

  async getChatPicture(
    sessionName: string,
    chatId: string,
    refresh = false,
  ): Promise<string | null> {
    try {
      const qs = refresh ? '?refresh=true' : '';
      const res = await this.request<{ url?: string; picture?: string }>(
        'GET',
        `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/picture${qs}`,
      );
      return res?.url ?? res?.picture ?? null;
    } catch {
      return null;
    }
  }

  /**
   * WAHA: marca todas as mensagens do chat como lidas (envia ✓✓ azul ao
   * contato). Equivale ao "marcar como lida" do app oficial.
   */
  async markChatRead(sessionName: string, chatId: string): Promise<void> {
    try {
      await this.request<void>(
        'POST',
        `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages/read`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // /sendSeen é o nome legacy
      if (message.includes('404')) {
        await this.request<void>('POST', '/api/sendSeen', {
          session: sessionName,
          chatId,
        });
      } else {
        throw err;
      }
    }
  }

  async getMessagesPaged(
    sessionName: string,
    chatId: string,
    limit = 50,
    offset = 0,
  ): Promise<WahaMessage[]> {
    const qs = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      downloadMedia: 'false',
    });
    const result = await this.request<
      WahaMessage[] | { messages?: WahaMessage[] }
    >(
      'GET',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages?${qs}`,
    );
    return Array.isArray(result) ? result : (result?.messages ?? []);
  }

  private normalizeChat(c: WahaChatRaw): WahaChat {
    const id = typeof c.id === 'string' ? c.id : (c.id?._serialized ?? '');
    const lastMessageBody =
      c.lastMessage?.body ??
      c.lastMessage?.caption ??
      c.lastMessage?._data?.body ??
      c.lastMessage?._data?.caption;
    const lmId =
      typeof c.lastMessage?.id === 'string'
        ? c.lastMessage.id
        : (c.lastMessage?.id?.id ?? null);
    return {
      id,
      name: c.name,
      isGroup: c.isGroup,
      isReadOnly: c.isReadOnly,
      unreadCount: c.unreadCount,
      timestamp: c.timestamp ?? c.lastMessage?.timestamp,
      lastMessageBody,
      lastMessageId: lmId,
      lastMessageFromMe: c.lastMessage?.fromMe ?? undefined,
      picture: c.picture ?? null,
    };
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
        const result = await this.request<
          WahaContact[] | { contacts?: WahaContact[] }
        >('GET', path);
        const list = Array.isArray(result) ? result : (result?.contacts ?? []);
        this.logger.log(`getContacts: ${list.length} contato(s) via ${path}`);
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

  async getContactAbout(
    sessionName: string,
    contactId: string,
  ): Promise<string | null> {
    try {
      const qs = new URLSearchParams({ contactId, session: sessionName });
      const res = await this.request<WahaContactAbout>(
        'GET',
        `/api/contacts/about?${qs}`,
      );
      return res?.about ?? null;
    } catch {
      return null;
    }
  }

  async checkContactExists(
    sessionName: string,
    phone: string,
  ): Promise<WahaCheckExists> {
    const qs = new URLSearchParams({ phone, session: sessionName });
    return this.request<WahaCheckExists>(
      'GET',
      `/api/contacts/check-exists?${qs}`,
    );
  }

  async blockContact(sessionName: string, contactId: string): Promise<void> {
    await this.request<void>('POST', '/api/contacts/block', {
      session: sessionName,
      contactId,
    });
  }

  async unblockContact(sessionName: string, contactId: string): Promise<void> {
    await this.request<void>('POST', '/api/contacts/unblock', {
      session: sessionName,
      contactId,
    });
  }

  /** Resolve LID (@lid) → telefone real (`@s.whatsapp.net`) via /lids. */
  async resolveLid(sessionName: string, lid: string): Promise<string | null> {
    try {
      const cleanLid = lid.replace(/@lid$/, '');
      const res = await this.request<{ pn?: string; phone?: string }>(
        'GET',
        `/api/${encodeURIComponent(sessionName)}/lids/${encodeURIComponent(cleanLid)}`,
      );
      return res?.pn ?? res?.phone ?? null;
    } catch {
      return null;
    }
  }

  // ---------- Send media ----------

  async sendImage(
    sessionName: string,
    chatId: string,
    file: { url?: string; data?: string; mimetype?: string; filename?: string },
    caption?: string,
    replyTo?: string,
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendImage', {
      session: sessionName,
      chatId,
      file,
      caption,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
  }

  async sendVideo(
    sessionName: string,
    chatId: string,
    file: { url?: string; data?: string; mimetype?: string; filename?: string },
    caption?: string,
    replyTo?: string,
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendVideo', {
      session: sessionName,
      chatId,
      file,
      caption,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
  }

  async sendVoice(
    sessionName: string,
    chatId: string,
    file: { url?: string; data?: string; mimetype?: string; filename?: string },
    replyTo?: string,
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendVoice', {
      session: sessionName,
      chatId,
      file: {
        ...file,
        mimetype: file.mimetype ?? 'audio/ogg; codecs=opus',
      },
      convert: true,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
  }

  async sendFile(
    sessionName: string,
    chatId: string,
    file: { url?: string; data?: string; mimetype?: string; filename?: string },
    caption?: string,
    replyTo?: string,
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendFile', {
      session: sessionName,
      chatId,
      file,
      caption,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
  }

  async sendLocation(
    sessionName: string,
    chatId: string,
    latitude: number,
    longitude: number,
    title?: string,
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendLocation', {
      session: sessionName,
      chatId,
      latitude,
      longitude,
      title,
    });
  }

  async sendContactVcard(
    sessionName: string,
    chatId: string,
    contacts: { fullName: string; phoneNumber: string }[],
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendContactVcard', {
      session: sessionName,
      chatId,
      contacts,
    });
  }

  async sendReaction(
    sessionName: string,
    chatId: string,
    messageId: string,
    reaction: string,
  ): Promise<void> {
    await this.request<void>('PUT', '/api/reaction', {
      session: sessionName,
      messageId,
      reaction,
    }).catch(() =>
      this.request<void>('POST', '/api/reaction', {
        session: sessionName,
        chatId,
        messageId,
        reaction,
      }),
    );
  }

  async sendTextWithOptions(
    sessionName: string,
    chatId: string,
    text: string,
    options?: {
      replyTo?: string;
      mentions?: string[];
      linkPreview?: boolean;
    },
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/sendText', {
      session: sessionName,
      chatId,
      text,
      ...(options?.replyTo ? { reply_to: options.replyTo } : {}),
      ...(options?.mentions ? { mentions: options.mentions } : {}),
      ...(options?.linkPreview !== undefined
        ? { linkPreview: options.linkPreview }
        : {}),
    });
  }

  // ---------- Presence / typing ----------

  async startTyping(sessionName: string, chatId: string): Promise<void> {
    await this.request<void>('POST', '/api/startTyping', {
      session: sessionName,
      chatId,
    });
  }

  async stopTyping(sessionName: string, chatId: string): Promise<void> {
    await this.request<void>('POST', '/api/stopTyping', {
      session: sessionName,
      chatId,
    });
  }

  async setPresence(
    sessionName: string,
    presence: 'online' | 'offline' | 'typing' | 'recording' | 'paused',
    chatId?: string,
  ): Promise<void> {
    await this.request<void>(
      'POST',
      `/api/${encodeURIComponent(sessionName)}/presence`,
      { presence, ...(chatId ? { chatId } : {}) },
    );
  }

  async getPresence(
    sessionName: string,
    chatId: string,
  ): Promise<WahaPresence | null> {
    try {
      return await this.request<WahaPresence>(
        'GET',
        `/api/${encodeURIComponent(sessionName)}/presence/${encodeURIComponent(chatId)}`,
      );
    } catch {
      return null;
    }
  }

  async subscribePresence(sessionName: string, chatId: string): Promise<void> {
    try {
      await this.request<void>(
        'POST',
        `/api/${encodeURIComponent(sessionName)}/presence/${encodeURIComponent(chatId)}/subscribe`,
      );
    } catch (err) {
      this.logger.debug(
        `subscribePresence falhou: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ---------- Groups ----------

  // ---------- Edit / delete / star / pin / forward ----------

  async editMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    text: string,
  ): Promise<void> {
    await this.request<void>(
      'PUT',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
      { text },
    );
  }

  async deleteMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
  ): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    );
  }

  async starMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    star: boolean,
  ): Promise<void> {
    const action = star ? 'star' : 'unstar';
    await this.request<void>(
      'POST',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/${action}`,
    );
  }

  async pinMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    durationSeconds = 86400,
  ): Promise<void> {
    await this.request<void>(
      'POST',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
      { duration: durationSeconds },
    );
  }

  async unpinMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
  ): Promise<void> {
    await this.request<void>(
      'POST',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/unpin`,
    );
  }

  async forwardMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
  ): Promise<WahaSendResult> {
    return this.request<WahaSendResult>('POST', '/api/forwardMessage', {
      session: sessionName,
      chatId,
      messageId,
    });
  }

  async archiveChat(
    sessionName: string,
    chatId: string,
    archive: boolean,
  ): Promise<void> {
    const action = archive ? 'archive' : 'unarchive';
    await this.request<void>(
      'POST',
      `/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(chatId)}/${action}`,
    );
  }

  async getGroupParticipants(
    sessionName: string,
    groupId: string,
  ): Promise<WahaGroupParticipant[]> {
    try {
      const res = await this.request<
        WahaGroupParticipant[] | { participants?: WahaGroupParticipant[] }
      >(
        'GET',
        `/api/${encodeURIComponent(sessionName)}/groups/${encodeURIComponent(groupId)}/participants`,
      );
      return Array.isArray(res) ? res : (res?.participants ?? []);
    } catch {
      return [];
    }
  }
}
