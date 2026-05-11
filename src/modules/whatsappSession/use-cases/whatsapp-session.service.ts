import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageStatus,
  NotificationChannel,
  Prisma,
  WhatsappInstanceStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  WhatsappContactEntity,
  WhatsappConversationEntity,
  WhatsappInstanceEntity,
  WhatsappMessageEntity,
} from '../entities/whatsapp-session.entity';
import { extractExternalId, WahaApiClient } from './waha-api.client';
import { WhatsappChatbotService } from './whatsapp-chatbot.service';
import {
  WhatsappPubSubService,
  WHATSAPP_CONVERSATION_UPDATED,
  WHATSAPP_MESSAGE_RECEIVED,
  WHATSAPP_MESSAGE_UPDATED,
  WHATSAPP_PRESENCE_CHANGED,
} from './whatsapp-pubsub';

type RawInstance = Prisma.WhatsappInstanceGetPayload<{}>;
type RawMessage = Prisma.MessageLogGetPayload<{}>;

function instanceNameFor(companyId: string): string {
  return `company_${companyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`;
}

function toEntity(raw: RawInstance): WhatsappInstanceEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    instanceName: raw.instanceName,
    status: raw.status,
    qrCode: raw.qrCode,
    phone: raw.phone,
    profileName: raw.profileName,
    profilePicUrl: raw.profilePicUrl,
    lastError: raw.lastError,
    lastSeenAt: raw.lastSeenAt,
    connectedAt: raw.connectedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, '');
}

function isGroupJid(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith('@g.us');
}

function isLidJid(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith('@lid');
}

function isBroadcastJid(jid: string | null | undefined): boolean {
  return !!jid && (jid.endsWith('@broadcast') || jid === 'status@broadcast');
}

function isNewsletterJid(jid: string | null | undefined): boolean {
  return !!jid && jid.endsWith('@newsletter');
}

/**
 * Para individuais com phone → retorna telefone (só dígitos).
 * Para grupos (`@g.us`) e números ocultos (`@lid`) → preserva o JID completo
 * como "peerNumber". Isso mantém a distinção e permite reconstruir o JID ao
 * enviar (LID curto seria recusado pela validação de telefone).
 */
function peerKeyFromJid(jid: string | null | undefined): string {
  if (!jid) return '';
  if (isGroupJid(jid) || isLidJid(jid)) return jid;
  const at = jid.indexOf('@');
  return at >= 0 ? jid.slice(0, at) : jid;
}

function jidFromPeerKey(peerKey: string): string {
  if (
    peerKey.endsWith('@g.us') ||
    peerKey.endsWith('@s.whatsapp.net') ||
    peerKey.endsWith('@lid')
  ) {
    return peerKey;
  }
  const digits = normalizePhone(peerKey);
  return `${digits}@s.whatsapp.net`;
}

function phoneFromJid(jid: string | null | undefined): string {
  if (!jid) return '';
  const at = jid.indexOf('@');
  return at >= 0 ? jid.slice(0, at) : jid;
}

function extractQuotedMeta(quoted: Record<string, unknown>): {
  quotedMessageId: string | null;
  quotedBody: string | null;
  quotedParticipant: string | null;
} {
  const idVal = quoted.id;
  let quotedMessageId: string | null = null;
  if (typeof idVal === 'string') quotedMessageId = idVal;
  else if (idVal && typeof idVal === 'object') {
    const inner = (idVal as Record<string, unknown>).id;
    if (typeof inner === 'string') quotedMessageId = inner;
  }

  const participantVal = quoted.participant;
  let quotedParticipant: string | null = null;
  if (typeof participantVal === 'string') quotedParticipant = participantVal;
  else if (participantVal && typeof participantVal === 'object') {
    const ser = (participantVal as Record<string, unknown>)._serialized;
    if (typeof ser === 'string') quotedParticipant = ser;
  }

  return {
    quotedMessageId,
    quotedBody: (quoted.body as string | undefined) ?? null,
    quotedParticipant,
  };
}

function mapMessage(raw: RawMessage): WhatsappMessageEntity {
  const meta = (raw.metadataJson ?? {}) as Record<string, unknown>;
  const fromMe = raw.direction === 'OUTBOUND';
  const peerKey = fromMe ? raw.toAddress : (raw.fromAddress ?? raw.toAddress);
  const remoteJid = (meta.remoteJid as string | undefined) ?? peerKey;
  return {
    id: raw.id,
    peerNumber: peerKeyFromJid(remoteJid) || peerKey,
    fromMe,
    body: raw.body,
    status: raw.status,
    externalId: raw.externalId,
    participantNumber: (meta.participant as string | undefined)
      ? phoneFromJid(meta.participant as string)
      : null,
    participantName:
      (meta.participantName as string | undefined) ??
      (meta.pushName as string | undefined) ??
      null,
    mediaType: (meta.mediaType as string | undefined) ?? null,
    mediaUrl: (meta.mediaUrl as string | undefined) ?? null,
    mediaMimetype: (meta.mediaMimetype as string | undefined) ?? null,
    quotedMessageId: (meta.quotedMessageId as string | undefined) ?? null,
    quotedBody: (meta.quotedBody as string | undefined) ?? null,
    quotedParticipant: (meta.quotedParticipant as string | undefined) ?? null,
    createdAt: raw.createdAt,
    sentAt: raw.sentAt,
    deliveredAt: raw.deliveredAt,
    readAt: raw.readAt,
  };
}

@Injectable()
export class WhatsappSessionService {
  private readonly logger = new Logger(WhatsappSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waha: WahaApiClient,
    private readonly pubsub: WhatsappPubSubService,
    private readonly chatbot: WhatsappChatbotService,
  ) {}

  /**
   * Nome efetivo da sessão a usar nas chamadas WAHA.
   * - Em WAHA Plus (multi-tenant): retorna o instanceName da empresa.
   * - Em WAHA Core (single session): retorna WAHA_SESSION_NAME (ex.: "default").
   */
  private wahaSessionFor(inst: { instanceName: string }): string {
    return this.waha.sessionNameOverride ?? inst.instanceName;
  }

  async getOrCreateInstance(
    companyId: string,
  ): Promise<WhatsappInstanceEntity> {
    const existing = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (existing) return toEntity(existing);
    const created = await this.prisma.whatsappInstance.create({
      data: {
        companyId,
        instanceName: instanceNameFor(companyId),
        status: WhatsappInstanceStatus.DISCONNECTED,
        webhookToken: randomBytes(24).toString('hex'),
      },
    });
    return toEntity(created);
  }

  async refreshStatus(companyId: string): Promise<WhatsappInstanceEntity> {
    const inst = await this.getOrCreateInstance(companyId);
    const sessionName = this.wahaSessionFor(inst);
    try {
      const session = await this.waha.getSession(sessionName);
      const status = this.mapState(session.status ?? '');
      const phone = session.me?.id
        ? session.me.id.replace(/@.+$/, '')
        : undefined;
      const profileName = session.me?.pushName ?? undefined;
      const updated = await this.prisma.whatsappInstance.update({
        where: { id: inst.id },
        data: {
          status,
          lastSeenAt: new Date(),
          ...(status === WhatsappInstanceStatus.CONNECTED && !inst.connectedAt
            ? { connectedAt: new Date() }
            : {}),
          ...(status !== WhatsappInstanceStatus.QR_PENDING
            ? { qrCode: null }
            : {}),
          ...(phone ? { phone } : {}),
          ...(profileName ? { profileName } : {}),
          lastError: null,
        },
      });
      return toEntity(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isMissing =
        message.includes('404') || message.toLowerCase().includes('not found');
      if (isMissing) {
        return toEntity(
          await this.prisma.whatsappInstance.update({
            where: { id: inst.id },
            data: {
              status: WhatsappInstanceStatus.DISCONNECTED,
              qrCode: null,
              lastError: null,
            },
          }),
        );
      }
      this.logger.warn(`refreshStatus falhou: ${message}`);
      return toEntity(
        await this.prisma.whatsappInstance.update({
          where: { id: inst.id },
          data: { lastError: message.slice(0, 500) },
        }),
      );
    }
  }

  /**
   * Soft-connect: a sessão WAHA é criada e o QR escaneado direto no painel
   * do WAHA (https://<waha-host>/dashboard). Aqui só lemos o estado atual e
   * sincronizamos o DB local. Se a sessão ainda não existir no WAHA, o status
   * vira DISCONNECTED com instrução pra abrir o painel. Quando WORKING,
   * dispara um sync de contatos em background pra resolver LIDs.
   */
  async connect(companyId: string): Promise<WhatsappInstanceEntity> {
    const inst = await this.getOrCreateInstance(companyId);
    const sessionName = this.wahaSessionFor(inst);
    const result = await this.refreshStatus(companyId).catch(async () => {
      const updated = await this.prisma.whatsappInstance.update({
        where: { id: inst.id },
        data: {
          status: WhatsappInstanceStatus.DISCONNECTED,
          qrCode: null,
          lastError: `Sessão "${sessionName}" indisponível no WAHA. Conecte pelo painel do WAHA.`,
        },
      });
      return toEntity(updated);
    });
    if (result.status === WhatsappInstanceStatus.CONNECTED) {
      this.syncContactsFromWaha(companyId).catch((err) =>
        this.logger.warn(
          `syncContactsFromWaha (background) falhou: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }
    return result;
  }

  /**
   * Sincroniza contatos do WAHA pra cache local. Estratégia:
   *  1) Tenta /api/{session}/contacts/all (full payload). Em algumas engines
   *     do WAHA (WEBJS) esse endpoint retorna 500 — `getContacts` devolve [].
   *  2) Fallback: deriva de /chats — o `name` do chat já vem resolvido pelo
   *     WAHA (telefone formatado pra contatos salvos, "+55 21 9...").
   *
   * O cache deixa a leitura de listas/contatos rápida e oferece fallback de
   * resolução de LID quando o WAHA não consegue mais (sessão dormindo etc.).
   */
  async syncContactsFromWaha(companyId: string): Promise<number> {
    const inst = await this.getOrCreateInstance(companyId);
    if (inst.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp não está conectado.');
    }
    const sessionName = this.wahaSessionFor(inst);

    let upserted = 0;
    const contacts = await this.waha.getContacts(sessionName);
    for (const c of contacts) {
      const jid = c.id?.trim();
      if (!jid) continue;
      const number = c.number?.replace(/\D+/g, '') || null;
      const name = c.name ?? null;
      const pushName = c.pushname ?? c.shortName ?? null;
      const isMyContact = !!c.isMyContact;
      const isGroup = !!c.isGroup || jid.endsWith('@g.us');
      await this.prisma.whatsappContact.upsert({
        where: { companyId_jid: { companyId, jid } },
        create: {
          companyId,
          jid,
          number,
          name,
          pushName,
          isMyContact,
          isGroup,
        },
        update: {
          number,
          name,
          pushName,
          isMyContact,
          isGroup,
          syncedAt: new Date(),
        },
      });
      upserted++;
    }

    // Fallback: deriva contatos da lista de chats. Em WAHA WEBJS isso já cobre
    // tudo o que o painel mostra — `chat.name` vem com o telefone resolvido.
    if (upserted === 0) {
      const chats = await this.waha.getChats(sessionName);
      for (const ch of chats) {
        const jid = ch.id?.trim();
        if (!jid) continue;
        const isGroup = !!ch.isGroup || jid.endsWith('@g.us');
        const name = ch.name ?? null;
        // Quando o `name` for um telefone formatado (ex: "+55 21 98897-3348"),
        // extraímos os dígitos pra usar como `number` real.
        const digits = name ? name.replace(/\D+/g, '') : '';
        const number = digits.length >= 10 ? digits : null;
        await this.prisma.whatsappContact.upsert({
          where: { companyId_jid: { companyId, jid } },
          create: { companyId, jid, number, name, isGroup, isMyContact: false },
          update: { number, name, isGroup, syncedAt: new Date() },
        });
        upserted++;
      }
    }

    this.logger.log(
      `syncContactsFromWaha: ${upserted} contato(s) sincronizado(s) (${sessionName})`,
    );
    // Background: preenche fotos de perfil em paralelo (limite). WAHA bloqueia
    // se chamarmos em rajada — limitamos concorrência via fila simples.
    this.refreshMissingProfilePics(companyId, sessionName).catch((err) =>
      this.logger.debug(
        `refreshMissingProfilePics: ${err instanceof Error ? err.message : err}`,
      ),
    );
    return upserted;
  }

  /**
   * Busca foto de perfil para contatos individuais (não-grupo) sem cache ou
   * com cache stale (>7d). Limita a 50 contatos por execução pra não estourar
   * rate-limit do WAHA. Falhas são silenciosas — voltamos a tentar na próxima.
   */
  private async refreshMissingProfilePics(
    companyId: string,
    sessionName: string,
  ): Promise<void> {
    const STALE_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - STALE_MS);
    const targets = await this.prisma.whatsappContact.findMany({
      where: {
        companyId,
        isGroup: false,
        OR: [{ picFetchedAt: null }, { picFetchedAt: { lt: cutoff } }],
      },
      take: 50,
      orderBy: { syncedAt: 'desc' },
    });
    for (const c of targets) {
      try {
        const res = await this.waha.getContactAvatar(sessionName, c.jid);
        const url = res.profilePictureURL ?? res.url ?? res.value ?? null;
        await this.prisma.whatsappContact.update({
          where: { id: c.id },
          data: { profilePicUrl: url, picFetchedAt: new Date() },
        });
      } catch {
        // erro silencioso — registra fetch pra não tentar de novo já já
        await this.prisma.whatsappContact.update({
          where: { id: c.id },
          data: { picFetchedAt: new Date() },
        });
      }
    }
  }

  /**
   * Resolve um JID (incluindo @lid) pra { jid, phone, name }. Tenta:
   *  1) cache WhatsappContact pelo JID;
   *  2) cache pelos dígitos puros (caso o WAHA tenha gravado com @c.us em vez de @s.whatsapp.net);
   *  3) fallback null pros campos não conhecidos.
   * Telefone real só existe se o contato estiver salvo na agenda do aparelho.
   */
  private async resolveContact(
    companyId: string,
    jid: string,
  ): Promise<{ jid: string; phone: string | null; name: string | null }> {
    if (!jid) return { jid, phone: null, name: null };
    const direct = await this.prisma.whatsappContact.findUnique({
      where: { companyId_jid: { companyId, jid } },
    });
    if (direct) {
      return {
        jid,
        phone: direct.number ?? null,
        name: direct.name ?? direct.pushName ?? null,
      };
    }
    if (isLidJid(jid)) {
      const lidDigits = jid.replace(/@lid$/, '');
      const byDigits = await this.prisma.whatsappContact.findFirst({
        where: { companyId, OR: [{ number: lidDigits }, { jid: lidDigits }] },
      });
      if (byDigits) {
        return {
          jid,
          phone: byDigits.number ?? null,
          name: byDigits.name ?? byDigits.pushName ?? null,
        };
      }
    }
    return { jid, phone: null, name: null };
  }

  async reconfigureWebhook(companyId: string): Promise<{
    ok: boolean;
    format: string | null;
    webhookUrl: string | null;
  }> {
    const inst = await this.getOrCreateInstance(companyId);
    const sessionName = this.wahaSessionFor(inst);
    const url = this.waha.buildWebhookUrl(sessionName);
    if (!url) throw new Error('WAHA_WEBHOOK_URL não configurada.');
    await this.waha.updateSessionWebhook(sessionName, url);
    return { ok: true, format: 'waha', webhookUrl: url };
  }

  async getWebhookConfigFromEvolution(companyId: string): Promise<string> {
    const inst = await this.getOrCreateInstance(companyId);
    const session = await this.waha.getSession(this.wahaSessionFor(inst));
    return JSON.stringify(session, null, 2);
  }

  async syncMessagesForPeer(
    companyId: string,
    peerNumber: string,
    limit = 200,
  ): Promise<number> {
    const inst = await this.getOrCreateInstance(companyId);
    if (inst.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp não está conectado.');
    }
    const isGroup = isGroupJid(peerNumber);
    const phone = isGroup ? peerNumber : normalizePhone(peerNumber);
    if (!isGroup && phone.length < 10) {
      throw new BadRequestException('Telefone inválido.');
    }
    const remoteJid = jidFromPeerKey(peerNumber);

    let items: ReturnType<typeof Object.assign>[] = [];
    try {
      items = await this.waha.getMessages(
        this.wahaSessionFor(inst),
        remoteJid,
        limit,
      );
    } catch (err) {
      this.logger.warn(
        `getMessages falhou: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }

    let imported = 0;
    for (const item of items) {
      const externalId = item._data?.id?.id ?? item.id ?? null;
      const fromMe = !!item.fromMe;
      if (externalId) {
        const existing = await this.prisma.messageLog.findFirst({
          where: { externalId, companyId },
          select: { id: true },
        });
        if (existing) continue;
      }

      const text = item.body ?? '';
      if (!text) continue;

      const createdAt =
        typeof item.timestamp === 'number'
          ? new Date(item.timestamp * 1000)
          : new Date();

      const pushName = item._data?.pushName ?? item._data?.notifyName ?? null;

      await this.prisma.messageLog.create({
        data: {
          companyId,
          channel: NotificationChannel.WHATSAPP,
          direction: fromMe ? 'OUTBOUND' : 'INBOUND',
          toAddress: fromMe ? phone : isGroup ? phone : '',
          fromAddress: fromMe ? null : phone,
          body: text,
          status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED,
          externalId,
          metadataJson: {
            pushName,
            remoteJid,
            isGroup,
            participant: null,
            participantName: pushName,
            source: 'history-sync',
          },
          createdAt,
          ...(fromMe ? { sentAt: createdAt } : { deliveredAt: createdAt }),
        },
      });
      imported++;
    }

    this.logger.log(
      `syncMessagesForPeer: ${imported} mensagem(ns) importadas de ${phone}`,
    );
    return imported;
  }

  async syncFromEvolution(companyId: string): Promise<number> {
    const inst = await this.getOrCreateInstance(companyId);
    if (inst.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp não está conectado.');
    }
    let list: { id?: string; name?: string; isGroup?: boolean }[] = [];
    try {
      list = await this.waha.getChats(this.wahaSessionFor(inst));
    } catch (err) {
      this.logger.warn(
        `getChats falhou: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }

    let count = 0;
    let skippedOther = 0;
    for (const chat of list) {
      const remoteJid = chat.id;
      if (!remoteJid) continue;

      if (isBroadcastJid(remoteJid) || isNewsletterJid(remoteJid)) {
        skippedOther++;
        continue;
      }

      const isGroup = isGroupJid(remoteJid);
      const peerKey = peerKeyFromJid(remoteJid);
      if (!peerKey) continue;

      const pushName = chat.name ?? null;

      const existing = await this.prisma.messageLog.findFirst({
        where: {
          companyId,
          channel: NotificationChannel.WHATSAPP,
          ...this.buildPeerWhere(peerKey),
        },
        select: { id: true },
      });
      if (existing) continue;

      await this.prisma.messageLog.create({
        data: {
          companyId,
          channel: NotificationChannel.WHATSAPP,
          direction: 'INBOUND',
          toAddress: isGroup ? remoteJid : '',
          fromAddress: isGroup ? remoteJid : peerKey,
          body: isGroup
            ? '— grupo importado do WhatsApp —'
            : '— contato importado do WhatsApp —',
          status: MessageStatus.READ,
          metadataJson: {
            pushName,
            source: 'sync',
            remoteJid,
            isGroup,
          },
        },
      });
      count++;
    }
    if (skippedOther > 0) {
      this.logger.log(
        `syncFromEvolution: ${skippedOther} broadcast/newsletter pulados`,
      );
    }
    return count;
  }

  /**
   * Em modo single-session (WAHA Core), parar a sessão derrubaria todas as
   * empresas. Aqui só desvinculamos no DB local; o logout efetivo é feito
   * pelo admin direto no painel do WAHA.
   */
  async disconnect(companyId: string): Promise<WhatsappInstanceEntity> {
    const inst = await this.getOrCreateInstance(companyId);
    const updated = await this.prisma.whatsappInstance.update({
      where: { id: inst.id },
      data: {
        status: WhatsappInstanceStatus.DISCONNECTED,
        qrCode: null,
        connectedAt: null,
      },
    });
    return toEntity(updated);
  }

  async sendText(
    companyId: string,
    to: string,
    body: string,
    customerId?: string | null,
    options?: { replyTo?: string; mentions?: string[] },
  ): Promise<WhatsappMessageEntity> {
    if (!body.trim()) {
      throw new BadRequestException('Mensagem vazia.');
    }
    let inst = await this.getOrCreateInstance(companyId);
    // Se status local diz desconectado, tenta refresh antes de bloquear
    if (inst.status !== WhatsappInstanceStatus.CONNECTED) {
      this.logger.log(
        `sendText: status local é ${inst.status}, fazendo refresh antes de enviar`,
      );
      inst = await this.refreshStatus(companyId);
    }
    if (inst.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException(
        `WhatsApp não está conectado (status: ${inst.status}). Conecte primeiro via QR.`,
      );
    }

    // JIDs especiais (grupo @g.us / @lid) vão como estão; números reais sanitizam
    const isJid = isGroupJid(to) || isLidJid(to);
    const target = isJid ? to : normalizePhone(to);
    if (!isJid && target.length < 10) {
      throw new BadRequestException('Telefone inválido.');
    }
    let phone = target;

    // Se for LID, tenta resolver pra telefone real via cache de contatos. WhatsApp
    // costuma rejeitar envio direto pra @lid; a resolução vem do contato salvo
    // na agenda do aparelho conectado ao WAHA.
    if (isLidJid(to)) {
      const resolved = await this.resolveContact(companyId, to);
      if (resolved.phone && resolved.phone.length >= 10) {
        phone = `${resolved.phone}@s.whatsapp.net`;
        this.logger.log(`sendText: LID ${to} resolvido pra ${phone}`);
      } else {
        this.logger.warn(
          `sendText: LID ${to} sem telefone resolvido — tentando enviar como @lid mesmo (pode falhar).`,
        );
      }
    }

    const sessionName = this.wahaSessionFor(inst);
    this.logger.log(
      `sendText: ${sessionName} → ${phone} (${body.length} chars)`,
    );

    const log = await this.prisma.messageLog.create({
      data: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        direction: 'OUTBOUND',
        toAddress: phone,
        body,
        status: MessageStatus.PENDING,
        customerId: customerId ?? null,
        metadataJson: {
          kind: 'waha-direct',
          ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
          ...(options?.mentions ? { mentions: options.mentions } : {}),
        },
      },
    });

    try {
      // WAHA espera chatId no formato JID completo
      const chatId = isJid ? phone : `${phone}@s.whatsapp.net`;
      const result =
        options?.replyTo || options?.mentions?.length
          ? await this.waha.sendTextWithOptions(sessionName, chatId, body, {
              replyTo: options.replyTo,
              mentions: options.mentions,
            })
          : await this.waha.sendText(sessionName, chatId, body);
      const externalId = extractExternalId(result);
      const updated = await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.SENT,
          externalId,
          sentAt: new Date(),
        },
      });
      const entity = mapMessage(updated);
      this.pubsub.publish(WHATSAPP_MESSAGE_UPDATED, {
        whatsappMessageUpdated: { ...entity, companyId },
      });
      return entity;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: message.slice(0, 500),
        },
      });
      this.logger.error(`sendText falhou em ${sessionName}: ${message}`);
      throw new BadRequestException(`Falha ao enviar: ${message}`);
    }
  }

  /**
   * Lista de conversas equivalente à do painel do WAHA: usa /chats como fonte
   * primária (todos os chats ativos do WhatsApp), enriquece com nome/telefone
   * do cache WhatsappContact e mescla estatísticas (não-lidas, total, último
   * texto) do MessageLog local. Se WAHA estiver indisponível ou desconectado,
   * cai pro modo legacy (agrupamento por MessageLog).
   */
  async listConversations(
    companyId: string,
  ): Promise<WhatsappConversationEntity[]> {
    const inst = await this.getOrCreateInstance(companyId);

    type Conv = {
      peerNumber: string;
      peerName: string | null;
      profilePicUrl: string | null;
      customerId: string | null;
      lastMessage: string | null;
      lastMessageAt: Date | null;
      unreadCount: number;
      totalMessages: number;
      isGroup: boolean;
      isHiddenNumber: boolean;
    };
    const groups = new Map<string, Conv>();
    const fromWaha = new Set<string>();

    // 1. Fonte primária: chats vivos do WAHA (mesmo dado que o painel mostra).
    //    O `name` já vem resolvido pelo WAHA (formato "+55 21 98897-3348" pra
    //    contatos salvos, ou nome da agenda) e `unreadCount` / `lastMessageBody`
    //    vêm prontos. É exatamente o que o dashboard renderiza.
    if (inst.status === WhatsappInstanceStatus.CONNECTED) {
      try {
        // /chats/overview → mesmo dado da UI do painel WAHA (nome + picture +
        // unread + última msg). Cai pra /chats se overview não existir.
        const liveChats = await this.waha.getChatsOverview(
          this.wahaSessionFor(inst),
          200,
          0,
        );
        for (const chat of liveChats) {
          const remoteJid = chat.id;
          if (!remoteJid) continue;
          if (isBroadcastJid(remoteJid) || isNewsletterJid(remoteJid)) continue;

          const isGroup = !!chat.isGroup || isGroupJid(remoteJid);
          const isHiddenNumber = isLidJid(remoteJid);
          const peer = peerKeyFromJid(remoteJid) || remoteJid;
          const lastMessageAt =
            typeof chat.timestamp === 'number'
              ? new Date(chat.timestamp * 1000)
              : null;

          groups.set(peer, {
            peerNumber: peer,
            peerName: chat.name ?? null,
            profilePicUrl: chat.picture ?? null,
            customerId: null,
            lastMessage: chat.lastMessageBody ?? null,
            lastMessageAt,
            unreadCount: chat.unreadCount ?? 0,
            totalMessages: 0,
            isGroup,
            isHiddenNumber,
          });
          fromWaha.add(peer);

          // Persiste foto vinda do overview no cache de WhatsappContact pra
          // que `getContact` e refreshes futuros não precisem chamar de novo.
          if (chat.picture) {
            await this.prisma.whatsappContact
              .upsert({
                where: { companyId_jid: { companyId, jid: remoteJid } },
                create: {
                  companyId,
                  jid: remoteJid,
                  name: chat.name ?? null,
                  isGroup,
                  profilePicUrl: chat.picture,
                  picFetchedAt: new Date(),
                },
                update: {
                  profilePicUrl: chat.picture,
                  picFetchedAt: new Date(),
                  ...(chat.name ? { name: chat.name } : {}),
                },
              })
              .catch(() => undefined);
          }
        }
      } catch (err) {
        this.logger.warn(
          `listConversations: getChatsOverview falhou, usando histórico local — ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    // 2. Camada de histórico/estatísticas do MessageLog. Funciona como fallback
    //    (quando o WAHA não respondeu nada) e como fonte de unread/total/lastBody
    //    quando o WAHA respondeu.
    const messages = await this.prisma.messageLog.findMany({
      where: { companyId, channel: NotificationChannel.WHATSAPP },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, name: true } } },
      take: 2000,
    });

    for (const m of messages) {
      const meta = (m.metadataJson ?? {}) as Record<string, unknown>;
      const remoteJid =
        (meta.remoteJid as string | undefined) ??
        (m.direction === 'OUTBOUND'
          ? m.toAddress
          : (m.fromAddress ?? m.toAddress));
      const peer = peerKeyFromJid(remoteJid) || remoteJid;
      if (!peer) continue;

      const isGroup = isGroupJid(remoteJid);
      const isHiddenNumber = isLidJid(remoteJid);
      const pushName =
        (meta.groupSubject as string | undefined) ??
        (meta.subject as string | undefined) ??
        (meta.pushName as string | undefined);
      const isUnread =
        m.direction === 'INBOUND' && m.status !== MessageStatus.READ;

      const existing = groups.get(peer);
      if (!existing) {
        groups.set(peer, {
          peerNumber: peer,
          peerName: pushName ?? m.customer?.name ?? null,
          profilePicUrl: null,
          customerId: m.customerId ?? null,
          lastMessage: m.body,
          lastMessageAt: m.createdAt,
          unreadCount: isUnread ? 1 : 0,
          totalMessages: 1,
          isGroup,
          isHiddenNumber,
        });
      } else {
        existing.totalMessages += 1;
        // unreadCount: se veio do WAHA, ele é a verdade — não incrementa.
        // Caso contrário (entrada criada só pelo MessageLog), conta local.
        if (!fromWaha.has(peer) && isUnread) existing.unreadCount += 1;
        if (!existing.customerId && m.customerId) {
          existing.customerId = m.customerId;
        }
        // Nome resolvido do WAHA tem prioridade. Só preenche aqui se nada veio.
        if (!existing.peerName && (pushName || m.customer?.name)) {
          existing.peerName = pushName ?? m.customer?.name ?? null;
        }
        // lastMessage: se entrada veio do WAHA, mantém o body do WAHA. Se não,
        // pega o registro mais recente.
        if (!fromWaha.has(peer)) {
          const mAt = m.createdAt.getTime();
          const eAt = existing.lastMessageAt?.getTime() ?? 0;
          if (mAt >= eAt || !existing.lastMessage) {
            existing.lastMessage = m.body;
            existing.lastMessageAt = m.createdAt;
          }
        }
      }
    }

    // 3. Enriquece nomes/telefones/fotos via cache de contatos do WAHA (resolve
    //    LIDs e contatos salvos na agenda do aparelho).
    const peers = Array.from(groups.values());
    if (peers.length > 0) {
      const cached = await this.prisma.whatsappContact.findMany({
        where: {
          companyId,
          jid: { in: peers.map((p) => p.peerNumber) },
        },
      });
      const byJid = new Map(cached.map((c) => [c.jid, c] as const));
      for (const p of peers) {
        const c = byJid.get(p.peerNumber);
        if (c) {
          if (c.name || c.pushName) {
            p.peerName = c.name ?? c.pushName ?? p.peerName;
          }
          if (c.profilePicUrl) p.profilePicUrl = c.profilePicUrl;
        }
      }

      // Background: contatos sem foto cacheada (e não-grupos) → tenta buscar
      // pra próxima leitura. Não bloqueia a resposta atual.
      if (inst.status === WhatsappInstanceStatus.CONNECTED) {
        this.refreshMissingProfilePics(
          companyId,
          this.wahaSessionFor(inst),
        ).catch((err) =>
          this.logger.debug(
            `refreshMissingProfilePics (listConversations): ${err instanceof Error ? err.message : err}`,
          ),
        );
      }
    }

    return peers.sort((a, b) => {
      const at = a.lastMessageAt?.getTime() ?? 0;
      const bt = b.lastMessageAt?.getTime() ?? 0;
      return bt - at;
    });
  }

  private buildPeerWhere(peerNumber: string): Prisma.MessageLogWhereInput {
    if (isGroupJid(peerNumber)) {
      // Grupo: filtra pelo metadata.remoteJid OU pelos campos to/from
      return {
        OR: [
          { toAddress: peerNumber },
          { fromAddress: peerNumber },
          {
            metadataJson: {
              path: ['remoteJid'],
              equals: peerNumber,
            },
          },
        ],
      };
    }
    if (isLidJid(peerNumber)) {
      // LID (número oculto): casa pelo JID completo via remoteJid e também
      // pelos dígitos do LID em to/from (registros antigos sem @lid no key).
      const lidDigits = peerNumber.replace(/@lid$/, '');
      return {
        OR: [
          { toAddress: peerNumber },
          { fromAddress: peerNumber },
          { toAddress: lidDigits },
          { fromAddress: lidDigits },
          {
            metadataJson: {
              path: ['remoteJid'],
              equals: peerNumber,
            },
          },
        ],
      };
    }
    const phone = normalizePhone(peerNumber);
    return {
      OR: [
        { toAddress: { contains: phone } },
        { fromAddress: { contains: phone } },
      ],
    };
  }

  async listMessages(
    companyId: string,
    peerNumber: string,
    limit = 200,
  ): Promise<WhatsappMessageEntity[]> {
    const messages = await this.prisma.messageLog.findMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        ...this.buildPeerWhere(peerNumber),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return messages.map(mapMessage);
  }

  async getContact(
    companyId: string,
    peerNumber: string,
  ): Promise<WhatsappContactEntity> {
    const where: Prisma.MessageLogWhereInput = {
      companyId,
      channel: NotificationChannel.WHATSAPP,
      ...this.buildPeerWhere(peerNumber),
    };
    const now = new Date();
    const ts7d = new Date(now.getTime() - 7 * 86400000);
    const ts30d = new Date(now.getTime() - 30 * 86400000);
    const ts24h = new Date(now.getTime() - 24 * 3600000);

    const [
      first,
      last,
      total,
      inbound,
      outbound,
      msg7d,
      msg30d,
      recent50,
      last24h,
    ] = await this.prisma.$transaction([
      this.prisma.messageLog.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      this.prisma.messageLog.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      this.prisma.messageLog.count({ where }),
      this.prisma.messageLog.count({
        where: { ...where, direction: 'INBOUND' },
      }),
      this.prisma.messageLog.count({
        where: { ...where, direction: 'OUTBOUND' },
      }),
      this.prisma.messageLog.count({
        where: { ...where, createdAt: { gte: ts7d } },
      }),
      this.prisma.messageLog.count({
        where: { ...where, createdAt: { gte: ts30d } },
      }),
      this.prisma.messageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { direction: true, createdAt: true, metadataJson: true },
      }),
      this.prisma.messageLog.count({
        where: { ...where, createdAt: { gte: ts24h } },
      }),
    ]);

    // Tempo médio de resposta: pares (INBOUND → OUTBOUND) próximos no tempo
    const responseTimes: number[] = [];
    let unansweredOutbound = 0;
    let mediaCount = 0;
    let callCount = 0;
    for (let i = 0; i < recent50.length; i++) {
      const m = recent50[i];
      const meta = (m.metadataJson ?? {}) as Record<string, unknown>;
      if (meta.mediaType) mediaCount++;
      if (meta.kind === 'call') callCount++;
    }
    // ordem cronológica ascendente pra cálculo
    const chrono = [...recent50].reverse();
    let lastInbound: Date | null = null;
    let consecutiveOutbound = 0;
    for (const m of chrono) {
      if (m.direction === 'INBOUND') {
        lastInbound = m.createdAt;
        consecutiveOutbound = 0;
      } else if (m.direction === 'OUTBOUND') {
        if (lastInbound) {
          const diffMin = Math.round(
            (m.createdAt.getTime() - lastInbound.getTime()) / 60000,
          );
          if (diffMin >= 0 && diffMin <= 7 * 24 * 60)
            responseTimes.push(diffMin);
          lastInbound = null;
        }
        consecutiveOutbound++;
      }
    }
    unansweredOutbound = consecutiveOutbound;

    // mediana
    let avgResponseMinutes: number | null = null;
    if (responseTimes.length > 0) {
      const sorted = [...responseTimes].sort((a, b) => a - b);
      avgResponseMinutes = sorted[Math.floor(sorted.length / 2)];
    }

    const lastMessageAtCalc = last?.createdAt ?? null;
    const daysSinceLastMessage = lastMessageAtCalc
      ? Math.floor((now.getTime() - lastMessageAtCalc.getTime()) / 86400000)
      : 0;
    const shouldGreet = last24h === 0 && total > 0;

    // Cache CRM (tags/notes/status/assignment) — guardamos no metadata da
    // mensagem mais recente. Persistir em coluna dedicada seria melhor mas
    // foge do escopo dessa migration.
    const crmCache =
      (((last?.metadataJson ?? {}) as Record<string, unknown>).crmCache as
        | Record<string, unknown>
        | undefined) ?? {};
    const tags = ((crmCache.tags as string[] | undefined) ?? []).filter(
      (t) => !!t,
    );
    const internalNotes =
      (crmCache.internalNotes as string | undefined) ?? null;
    const conversationStatus =
      (crmCache.conversationStatus as string | undefined) ?? 'open';
    const assignedUserId =
      (crmCache.assignedUserId as string | undefined) ?? null;
    const assignedUserName =
      (crmCache.assignedUserName as string | undefined) ?? null;

    const isGroup = isGroupJid(peerNumber);
    const baseMeta = (last?.metadataJson ??
      first?.metadataJson ??
      {}) as Record<string, unknown>;

    // Cache de profile no metadata (evita bater no Evolution toda hora)
    const profileCache =
      (baseMeta.profileCache as Record<string, unknown> | undefined) ?? {};
    const cachedAt =
      typeof profileCache.fetchedAt === 'number' ? profileCache.fetchedAt : 0;
    const STALE_MS = 24 * 60 * 60 * 1000; // 24h
    const isStale = Date.now() - cachedAt > STALE_MS;

    // Cache primário: WhatsappContact (preenchido por syncContactsFromWaha)
    const cachedContact = await this.prisma.whatsappContact.findUnique({
      where: { companyId_jid: { companyId, jid: peerNumber } },
    });
    let profilePicUrl =
      cachedContact?.profilePicUrl ??
      (profileCache.profilePicUrl as string | undefined) ??
      (baseMeta.profilePicUrl as string | undefined) ??
      null;
    let about: string | null =
      (profileCache.about as string | undefined) ?? null;
    let isBusiness = !!profileCache.isBusiness;
    let verifiedName =
      (profileCache.verifiedName as string | undefined) ?? null;
    let businessCategory =
      (profileCache.businessCategory as string | undefined) ?? null;
    let businessDescription =
      (profileCache.businessDescription as string | undefined) ?? null;

    // Tenta enriquecer via Evolution se conectado e (cache vazio OR stale)
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    const canFetch =
      inst?.status === WhatsappInstanceStatus.CONNECTED && !isGroup;

    if (canFetch && (isStale || !profilePicUrl)) {
      try {
        const number = normalizePhone(peerNumber);
        const contactId = `${number}@s.whatsapp.net`;
        const avatarRes = await this.waha.getContactAvatar(
          this.wahaSessionFor(inst!),
          contactId,
        );
        const avatarUrl =
          avatarRes.profilePictureURL ??
          avatarRes.url ??
          avatarRes.value ??
          null;
        if (avatarUrl) profilePicUrl = avatarUrl;

        // Persiste o cache no MessageLog mais recente
        if (last) {
          const newMeta = {
            ...baseMeta,
            profileCache: {
              fetchedAt: Date.now(),
              profilePicUrl,
              about,
              isBusiness,
              verifiedName,
              businessCategory,
              businessDescription,
            },
          };
          await this.prisma.messageLog.update({
            where: { id: last.id },
            data: { metadataJson: newMeta as Prisma.InputJsonValue },
          });
        }
      } catch (err) {
        this.logger.warn(
          `getContact: enrichment falhou: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    // Resolve via cache de contatos do WAHA — traz nome da agenda e (em LIDs)
    // o telefone real quando disponível. Igual o painel do WAHA exibe.
    const resolved = await this.resolveContact(companyId, peerNumber);

    const displayName =
      resolved.name ??
      verifiedName ??
      (baseMeta.pushName as string | undefined) ??
      (baseMeta.subject as string | undefined) ??
      last?.customer?.name ??
      first?.customer?.name ??
      (isGroup ? 'Grupo do WhatsApp' : peerNumber);

    const customerId = last?.customerId ?? first?.customerId ?? null;
    const customerName = last?.customer?.name ?? first?.customer?.name ?? null;
    const realPhoneDigits =
      resolved.phone ??
      (isGroup || isLidJid(peerNumber) ? null : normalizePhone(peerNumber));
    const phoneFormatted = isGroup ? null : realPhoneDigits;
    const waLink =
      isGroup || !realPhoneDigits ? '' : `https://wa.me/${realPhoneDigits}`;

    return {
      peerNumber,
      displayName,
      phoneFormatted,
      isGroup,
      profilePicUrl,
      about,
      isBusiness,
      verifiedName,
      businessCategory,
      businessDescription,
      customerId,
      customerName,
      totalMessages: total,
      inboundCount: inbound,
      outboundCount: outbound,
      messages7d: msg7d,
      messages30d: msg30d,
      daysSinceLastMessage,
      avgResponseMinutes,
      unansweredOutbound,
      mediaCount,
      callCount,
      picFetchedAt: cachedContact?.picFetchedAt ?? null,
      shouldGreet,
      tags,
      internalNotes,
      conversationStatus,
      assignedUserId,
      assignedUserName,
      firstMessageAt: first?.createdAt ?? null,
      lastMessageAt: last?.createdAt ?? null,
      waLink,
    };
  }

  /**
   * Cria Customer a partir do contato WhatsApp e linka todas as mensagens.
   * Dedupe por sufixo de telefone (últimos 9 dígitos).
   */
  async createCustomerFromWhatsappContact(
    companyId: string,
    peerNumber: string,
    overrides?: { name?: string; document?: string; email?: string },
  ): Promise<{ customerId: string; linkedMessages: number }> {
    const contact = await this.getContact(companyId, peerNumber);
    const phone = contact.phoneFormatted ?? null;
    const name = overrides?.name?.trim() || contact.displayName;
    if (!name) {
      throw new BadRequestException('Sem nome para o cliente — informe um nome.');
    }

    let customer = phone
      ? await this.prisma.customer.findFirst({
          where: { companyId, phone: { contains: phone.slice(-9) } },
        })
      : null;
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          companyId,
          name,
          phone,
          email: overrides?.email?.trim() || null,
          document: overrides?.document?.trim() || null,
        },
      });
    }

    const linked = await this.prisma.messageLog.updateMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        ...this.buildPeerWhere(peerNumber),
      },
      data: { customerId: customer.id },
    });
    return { customerId: customer.id, linkedMessages: linked.count };
  }

  /**
   * Lista contatos do WhatsApp com agregação de stats e link com Customer.
   * Usado pela sidebar "Contatos WhatsApp" no front.
   */
  async listWhatsappContacts(
    companyId: string,
  ): Promise<
    Array<{
      jid: string;
      number: string | null;
      name: string | null;
      profilePicUrl: string | null;
      isGroup: boolean;
      messageCount: number;
      customerId: string | null;
      customerName: string | null;
      lastInteractionAt: Date | null;
    }>
  > {
    const contacts = await this.prisma.whatsappContact.findMany({
      where: { companyId },
      orderBy: { syncedAt: 'desc' },
      take: 1000,
    });
    if (contacts.length === 0) return [];

    const stats = await this.prisma.messageLog.groupBy({
      by: ['toAddress'],
      where: { companyId, channel: NotificationChannel.WHATSAPP },
      _count: { id: true },
      _max: { createdAt: true },
    });
    const statsByPeer = new Map<string, { count: number; last: Date | null }>();
    for (const s of stats) {
      const existing = statsByPeer.get(s.toAddress) ?? {
        count: 0,
        last: null as Date | null,
      };
      existing.count += s._count.id;
      if (
        s._max.createdAt &&
        (!existing.last || s._max.createdAt > existing.last)
      ) {
        existing.last = s._max.createdAt;
      }
      statsByPeer.set(s.toAddress, existing);
    }

    const recent = await this.prisma.messageLog.findMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        customerId: { not: null },
      },
      select: {
        toAddress: true,
        customerId: true,
        customer: { select: { name: true } },
      },
      take: 5000,
    });
    const customerByPeer = new Map<
      string,
      { customerId: string; customerName: string | null }
    >();
    for (const r of recent) {
      const peer = peerKeyFromJid(r.toAddress);
      if (!customerByPeer.has(peer) && r.customerId) {
        customerByPeer.set(peer, {
          customerId: r.customerId,
          customerName: r.customer?.name ?? null,
        });
      }
    }

    return contacts.map((c) => {
      const peer = peerKeyFromJid(c.jid);
      const stat = statsByPeer.get(peer) ?? statsByPeer.get(c.jid);
      const cust = customerByPeer.get(peer);
      return {
        jid: c.jid,
        number: c.number,
        name: c.name ?? c.pushName,
        profilePicUrl: c.profilePicUrl,
        isGroup: c.isGroup,
        messageCount: stat?.count ?? 0,
        customerId: cust?.customerId ?? null,
        customerName: cust?.customerName ?? null,
        lastInteractionAt: stat?.last ?? null,
      };
    });
  }

  async linkCustomerToWhatsappContact(
    companyId: string,
    peerNumber: string,
    customerId: string,
  ): Promise<number> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new BadRequestException('Cliente não encontrado.');
    }
    const result = await this.prisma.messageLog.updateMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        ...this.buildPeerWhere(peerNumber),
      },
      data: { customerId },
    });
    return result.count;
  }

  async unlinkCustomerFromWhatsappContact(
    companyId: string,
    peerNumber: string,
  ): Promise<number> {
    const result = await this.prisma.messageLog.updateMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        ...this.buildPeerWhere(peerNumber),
      },
      data: { customerId: null },
    });
    return result.count;
  }

  async markConversationRead(
    companyId: string,
    peerNumber: string,
  ): Promise<number> {
    const result = await this.prisma.messageLog.updateMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        direction: 'INBOUND',
        status: { not: MessageStatus.READ },
        ...this.buildPeerWhere(peerNumber),
      },
      data: { status: MessageStatus.READ, readAt: new Date() },
    });

    // Envia ✓✓ azul ao contato (se sessão ativa). Falha silenciosa pra não
    // quebrar a UI quando WAHA estiver offline.
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (inst?.status === WhatsappInstanceStatus.CONNECTED) {
      const chatId = jidFromPeerKey(peerNumber);
      this.waha
        .markChatRead(this.wahaSessionFor(inst), chatId)
        .catch((err) =>
          this.logger.debug(
            `markChatRead falhou: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }
    return result.count;
  }

  async handleWebhook(
    instanceName: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    let inst = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
    });

    // Single-session mode (WAHA Core): a URL vem com o nome do override
    // (ex.: "default") mas o DB guarda instanceName por empresa. Resolve
    // pegando a instância mais recentemente ativa.
    if (!inst && this.waha.sessionNameOverride === instanceName) {
      inst = await this.prisma.whatsappInstance.findFirst({
        where: {
          status: {
            in: [
              WhatsappInstanceStatus.CONNECTED,
              WhatsappInstanceStatus.QR_PENDING,
              WhatsappInstanceStatus.CONNECTING,
            ],
          },
        },
        orderBy: { lastSeenAt: 'desc' },
      });
    }

    if (!inst) {
      this.logger.warn(`Webhook para instância desconhecida: ${instanceName}`);
      return;
    }

    // WAHA envelopa os dados em "payload"; Evolution usava "data"
    const data = (payload.payload ?? payload.data ?? payload) as Record<
      string,
      unknown
    >;
    const normalizedEvent = event.toLowerCase().replace(/_/g, '.');

    // session.status / connection.update
    if (
      normalizedEvent === 'session.status' ||
      normalizedEvent === 'connection.update' ||
      normalizedEvent === 'qrcode.updated'
    ) {
      const stateRaw =
        typeof data.status === 'string'
          ? data.status
          : typeof data.state === 'string'
            ? data.state.toLowerCase()
            : '';
      const status = this.mapState(stateRaw);
      const phone =
        (data.wuid as string | undefined) ??
        ((data.me as Record<string, unknown> | undefined)?.id as
          | string
          | undefined);
      await this.prisma.whatsappInstance.update({
        where: { id: inst.id },
        data: {
          status,
          ...(status === WhatsappInstanceStatus.QR_PENDING && data.qr
            ? {
                qrCode: String(data.qr).startsWith('data:')
                  ? String(data.qr)
                  : `data:image/png;base64,${String(data.qr)}`,
              }
            : status === WhatsappInstanceStatus.CONNECTED
              ? { qrCode: null }
              : {}),
          ...(typeof phone === 'string' && phone
            ? { phone: phone.replace(/@.+$/, '') }
            : {}),
          ...(status === WhatsappInstanceStatus.CONNECTED && !inst.connectedAt
            ? { connectedAt: new Date() }
            : {}),
          lastSeenAt: new Date(),
        },
      });
      return;
    }

    // message (WAHA) / messages.upsert (Evolution compat)
    if (
      normalizedEvent === 'message' ||
      normalizedEvent === 'messages.upsert'
    ) {
      const items: Record<string, unknown>[] = Array.isArray(data.messages)
        ? (data.messages as Record<string, unknown>[])
        : Array.isArray(payload.messages)
          ? (payload.messages as Record<string, unknown>[])
          : [data];

      for (const item of items) {
        // WAHA: item.from, item.fromMe, item.body, item.id, item.timestamp
        // Evolution: item.key.remoteJid, item.key.fromMe, item.message.conversation
        const fromMe =
          typeof item.fromMe === 'boolean'
            ? item.fromMe
            : !!(item.key as Record<string, unknown> | undefined)?.fromMe;

        const remoteJid =
          (item.from as string | undefined) ??
          (item.to as string | undefined) ??
          ((item.key as Record<string, unknown> | undefined)?.remoteJid as
            | string
            | undefined) ??
          '';

        if (
          !remoteJid ||
          isBroadcastJid(remoteJid) ||
          isNewsletterJid(remoteJid)
        ) {
          continue;
        }

        const participant =
          ((item._data as Record<string, unknown> | undefined)?.participant as
            | string
            | undefined) ??
          ((item.key as Record<string, unknown> | undefined)?.participant as
            | string
            | undefined) ??
          null;

        const externalId =
          ((
            (item._data as Record<string, unknown> | undefined)?.id as
              | Record<string, unknown>
              | undefined
          )?.id as string | undefined) ??
          (item.id as string | undefined) ??
          null;

        const messageObj = (item.message ?? {}) as Record<string, unknown>;
        const rawText =
          (item.body as string | undefined) ??
          (messageObj.conversation as string | undefined) ??
          ((
            messageObj.extendedTextMessage as
              | Record<string, unknown>
              | undefined
          )?.text as string | undefined) ??
          ((messageObj.imageMessage as Record<string, unknown> | undefined)
            ?.caption as string | undefined) ??
          ((messageObj.videoMessage as Record<string, unknown> | undefined)
            ?.caption as string | undefined) ??
          ((messageObj.documentMessage as Record<string, unknown> | undefined)
            ?.caption as string | undefined) ??
          '';

        const media = this.detectMedia(item, messageObj);
        const text = rawText || media?.placeholder || '';
        if (!text && !media) continue;

        // replyTo/quotedMsg — WAHA envia tanto em item.replyTo (formato novo)
        // quanto em item._data.quotedMsg (formato wweb antigo). Capturamos os
        // dois pra que o front possa renderizar a citação acima do balão.
        const replyTo =
          (item.replyTo as Record<string, unknown> | undefined) ?? null;
        const innerData =
          (item._data as Record<string, unknown> | undefined) ?? {};
        const quoted =
          replyTo ??
          (innerData.quotedMsg
            ? {
                id: innerData.quotedStanzaID,
                body: (innerData.quotedMsg as Record<string, unknown>).body,
                participant: innerData.quotedParticipant,
              }
            : null);

        const quotedMeta = quoted ? extractQuotedMeta(quoted) : null;

        if (externalId) {
          const existing = await this.prisma.messageLog.findFirst({
            where: { externalId },
            select: { id: true },
          });
          if (existing) continue;
        }

        const isGroup = isGroupJid(remoteJid);
        const peer = peerKeyFromJid(remoteJid);
        const pushName =
          ((item._data as Record<string, unknown> | undefined)?.pushName as
            | string
            | undefined) ??
          (item.pushName as string | undefined) ??
          null;
        const ts = item.timestamp ?? item.messageTimestamp;
        const createdAt =
          typeof ts === 'number'
            ? new Date(ts * 1000)
            : typeof ts === 'string'
              ? new Date(Number(ts) * 1000)
              : new Date();

        const createdMsg = await this.prisma.messageLog.create({
          data: {
            companyId: inst.companyId,
            channel: NotificationChannel.WHATSAPP,
            direction: fromMe ? 'OUTBOUND' : 'INBOUND',
            toAddress: fromMe ? peer : isGroup ? peer : '',
            fromAddress: fromMe ? null : peer,
            body: text,
            status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED,
            externalId,
            metadataJson: {
              pushName,
              remoteJid,
              isGroup,
              participant,
              participantName: pushName,
              source: 'webhook',
              ...(media
                ? {
                    mediaType: media.type,
                    mediaUrl: media.url ?? null,
                    mediaMimetype: media.mimetype ?? null,
                  }
                : {}),
              ...(quotedMeta ?? {}),
            },
            createdAt,
            ...(fromMe ? { sentAt: createdAt } : { deliveredAt: createdAt }),
          },
        });
        const entity = mapMessage(createdMsg);
        this.pubsub.publish(WHATSAPP_MESSAGE_RECEIVED, {
          whatsappMessageReceived: { ...entity, companyId: inst.companyId },
        });

        // Chatbot: avalia regras só pra mensagens INBOUND com texto
        if (!fromMe && text) {
          this.runChatbotForIncoming(
            inst.companyId,
            peer,
            text,
            inst.instanceName,
          ).catch((err) =>
            this.logger.warn(
              `chatbot run falhou: ${err instanceof Error ? err.message : err}`,
            ),
          );
        }
      }
      return;
    }

    // presence.update — bate o cache pra UI ler em getPeerPresence
    if (normalizedEvent === 'presence.update') {
      const chatId =
        (data.id as string | undefined) ?? (data.chatId as string | undefined);
      const presence = (data.presence as string | undefined) ?? null;
      const lastSeenRaw = data.lastSeen as number | undefined;
      if (chatId) {
        this.pubsub.publish(WHATSAPP_PRESENCE_CHANGED, {
          whatsappPresenceChanged: {
            companyId: inst.companyId,
            peerNumber: peerKeyFromJid(chatId),
            presence,
            lastSeen:
              typeof lastSeenRaw === 'number'
                ? new Date(lastSeenRaw * 1000)
                : null,
          },
        });
      }
      if (chatId) {
        const meta = {
          presence,
          lastSeen: lastSeenRaw ?? null,
          fetchedAt: Date.now(),
        };
        await this.prisma.whatsappContact
          .upsert({
            where: {
              companyId_jid: { companyId: inst.companyId, jid: chatId },
            },
            create: {
              companyId: inst.companyId,
              jid: chatId,
              isGroup: isGroupJid(chatId),
              syncedAt: new Date(),
            },
            update: { syncedAt: new Date() },
          })
          .catch(() => undefined);
        // armazena last presence num metadata local (último log do peer)
        const recent = await this.prisma.messageLog.findFirst({
          where: {
            companyId: inst.companyId,
            channel: NotificationChannel.WHATSAPP,
            ...this.buildPeerWhere(chatId),
          },
          orderBy: { createdAt: 'desc' },
        });
        if (recent) {
          const baseMeta = (recent.metadataJson ?? {}) as Record<
            string,
            unknown
          >;
          await this.prisma.messageLog.update({
            where: { id: recent.id },
            data: {
              metadataJson: {
                ...baseMeta,
                presenceCache: meta,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
      return;
    }

    // message.revoked — alguém apagou a mensagem
    if (normalizedEvent === 'message.revoked') {
      const idVal = data.id as string | { id?: string } | undefined;
      const externalId =
        typeof idVal === 'string' ? idVal : (idVal?.id ?? null);
      if (externalId) {
        const target = await this.prisma.messageLog.findFirst({
          where: { externalId, companyId: inst.companyId },
        });
        if (target) {
          const baseMeta = (target.metadataJson ?? {}) as Record<
            string,
            unknown
          >;
          await this.prisma.messageLog.update({
            where: { id: target.id },
            data: {
              body: '🚫 Esta mensagem foi apagada',
              metadataJson: {
                ...baseMeta,
                isRevoked: true,
                revokedAt: Date.now(),
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
      return;
    }

    // message.edited — texto alterado pelo remetente
    if (normalizedEvent === 'message.edited') {
      const idVal = data.id as string | { id?: string } | undefined;
      const externalId =
        typeof idVal === 'string' ? idVal : (idVal?.id ?? null);
      const newBody =
        ((data.message as Record<string, unknown> | undefined) ?? {}).body ??
        data.body;
      if (externalId && typeof newBody === 'string') {
        const target = await this.prisma.messageLog.findFirst({
          where: { externalId, companyId: inst.companyId },
        });
        if (target) {
          const baseMeta = (target.metadataJson ?? {}) as Record<
            string,
            unknown
          >;
          await this.prisma.messageLog.update({
            where: { id: target.id },
            data: {
              body: newBody,
              metadataJson: {
                ...baseMeta,
                isEdited: true,
                editedAt: Date.now(),
                originalBody: baseMeta.originalBody ?? target.body,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
      return;
    }

    // call.received / accepted / rejected — registra como mensagem virtual
    if (
      normalizedEvent === 'call.received' ||
      normalizedEvent === 'call.accepted' ||
      normalizedEvent === 'call.rejected'
    ) {
      const fromJid =
        (data.from as string | undefined) ??
        (data.peerJid as string | undefined);
      if (fromJid) {
        const isVideo = !!data.isVideo;
        const peer = peerKeyFromJid(fromJid);
        await this.prisma.messageLog.create({
          data: {
            companyId: inst.companyId,
            channel: NotificationChannel.WHATSAPP,
            direction: 'INBOUND',
            toAddress: '',
            fromAddress: peer,
            body: isVideo ? '📹 Chamada de vídeo' : '📞 Chamada de voz',
            status: MessageStatus.DELIVERED,
            metadataJson: {
              kind: 'call',
              callType: isVideo ? 'video' : 'voice',
              callEvent: normalizedEvent,
              remoteJid: fromJid,
            },
            createdAt: new Date(),
          },
        });
      }
      return;
    }

    // message.reaction — anexa reação ao messageLog correspondente
    if (normalizedEvent === 'message.reaction') {
      const targetId =
        (((data.message as Record<string, unknown> | undefined) ?? {}).id as
          | string
          | undefined) ?? (data.messageId as string | undefined);
      const reaction = (data.reaction as string | undefined) ?? '';
      const fromMe = !!data.fromMe;
      if (targetId) {
        const target = await this.prisma.messageLog.findFirst({
          where: { externalId: targetId, companyId: inst.companyId },
        });
        if (target) {
          const baseMeta = (target.metadataJson ?? {}) as Record<
            string,
            unknown
          >;
          const reactions =
            (baseMeta.reactions as Record<string, string>[] | undefined) ?? [];
          reactions.push({ reaction, fromMe: String(fromMe) });
          await this.prisma.messageLog.update({
            where: { id: target.id },
            data: {
              metadataJson: { ...baseMeta, reactions } as Prisma.InputJsonValue,
            },
          });
        }
      }
      return;
    }

    // message.ack (WAHA) / messages.update (Evolution compat)
    if (
      normalizedEvent === 'message.ack' ||
      normalizedEvent === 'messages.update'
    ) {
      const items: Record<string, unknown>[] = Array.isArray(data.messages)
        ? (data.messages as Record<string, unknown>[])
        : [data];

      for (const item of items) {
        // WAHA: item.id.id (string) or item.id (object), item.ack (number)
        // Evolution: item.key.id, item.update.status
        const idObj = item.id as Record<string, unknown> | string | undefined;
        const externalId =
          typeof idObj === 'object' && idObj !== null
            ? (idObj.id as string | undefined)
            : typeof idObj === 'string'
              ? idObj
              : ((item.key as Record<string, unknown> | undefined)?.id as
                  | string
                  | undefined);

        if (!externalId) continue;

        // WAHA ack: -1=error, 0=pending, 1=sent, 2=delivered, 3=read, 4=played
        const ackNum = typeof item.ack === 'number' ? item.ack : null;
        const statusStr = ((item.update as Record<string, unknown> | undefined)
          ?.status ?? item.status) as string | undefined;

        let mapped: MessageStatus | null = null;
        if (ackNum !== null) {
          if (ackNum === -1) mapped = MessageStatus.FAILED;
          else if (ackNum <= 1) mapped = MessageStatus.SENT;
          else if (ackNum === 2) mapped = MessageStatus.DELIVERED;
          else if (ackNum >= 3) mapped = MessageStatus.READ;
        } else if (statusStr) {
          mapped = this.mapMessageStatus(statusStr.toUpperCase());
        }

        if (!mapped) continue;
        await this.prisma.messageLog.updateMany({
          where: { externalId, companyId: inst.companyId },
          data: {
            status: mapped,
            ...(mapped === MessageStatus.DELIVERED
              ? { deliveredAt: new Date() }
              : {}),
            ...(mapped === MessageStatus.READ ? { readAt: new Date() } : {}),
          },
        });
      }
    }
  }

  /**
   * Identifica o tipo de mídia anexa numa mensagem do WAHA/Evolution e devolve
   * placeholder + metadata pra exibição no chat. Retorna null se não houver
   * mídia detectável (mensagem de texto puro).
   *
   * Tipos cobertos: sticker, image, video, audio, document, location, contact.
   * Para cada tipo, tenta extrair `mediaUrl`/`url` e `mimetype`.
   */
  private detectMedia(
    item: Record<string, unknown>,
    messageObj: Record<string, unknown>,
  ): {
    type: string;
    placeholder: string;
    url: string | null;
    mimetype: string | null;
  } | null {
    type AnyRec = Record<string, unknown>;
    const wahaMedia = (item.media as AnyRec | undefined) ?? null;
    const wahaType =
      (((item._data as AnyRec | undefined) ?? {}).type as string | undefined) ??
      (item.type as string | undefined);

    const pickUrl = (...candidates: (AnyRec | undefined)[]): string | null => {
      for (const c of candidates) {
        if (!c) continue;
        const u = (c.url ?? c.mediaUrl ?? c.directPath) as string | undefined;
        if (u) return u;
      }
      return null;
    };
    const pickMime = (...candidates: (AnyRec | undefined)[]): string | null => {
      for (const c of candidates) {
        if (!c) continue;
        const m = c.mimetype as string | undefined;
        if (m) return m;
      }
      return null;
    };

    const sticker =
      (messageObj.stickerMessage as AnyRec | undefined) ??
      (wahaType === 'sticker' ? (wahaMedia ?? {}) : undefined);
    if (sticker) {
      return {
        type: 'sticker',
        placeholder: '🎟️ Figurinha',
        url: pickUrl(sticker, wahaMedia ?? undefined),
        mimetype: pickMime(sticker, wahaMedia ?? undefined) ?? 'image/webp',
      };
    }

    const image =
      (messageObj.imageMessage as AnyRec | undefined) ??
      (wahaType === 'image' ? (wahaMedia ?? {}) : undefined);
    if (image) {
      return {
        type: 'image',
        placeholder: '📷 Imagem',
        url: pickUrl(image, wahaMedia ?? undefined),
        mimetype: pickMime(image, wahaMedia ?? undefined),
      };
    }

    const video =
      (messageObj.videoMessage as AnyRec | undefined) ??
      (wahaType === 'video' ? (wahaMedia ?? {}) : undefined);
    if (video) {
      return {
        type: 'video',
        placeholder: '🎥 Vídeo',
        url: pickUrl(video, wahaMedia ?? undefined),
        mimetype: pickMime(video, wahaMedia ?? undefined),
      };
    }

    const audio =
      (messageObj.audioMessage as AnyRec | undefined) ??
      (messageObj.pttMessage as AnyRec | undefined) ??
      (wahaType === 'audio' || wahaType === 'ptt'
        ? (wahaMedia ?? {})
        : undefined);
    if (audio) {
      const isPtt =
        (audio.ptt as boolean | undefined) === true || wahaType === 'ptt';
      return {
        type: isPtt ? 'ptt' : 'audio',
        placeholder: isPtt ? '🎙️ Mensagem de voz' : '🎵 Áudio',
        url: pickUrl(audio, wahaMedia ?? undefined),
        mimetype: pickMime(audio, wahaMedia ?? undefined),
      };
    }

    const doc =
      (messageObj.documentMessage as AnyRec | undefined) ??
      (wahaType === 'document' ? (wahaMedia ?? {}) : undefined);
    if (doc) {
      const fileName = (doc.fileName as string | undefined) ?? 'arquivo';
      return {
        type: 'document',
        placeholder: `📎 ${fileName}`,
        url: pickUrl(doc, wahaMedia ?? undefined),
        mimetype: pickMime(doc, wahaMedia ?? undefined),
      };
    }

    const location = messageObj.locationMessage as AnyRec | undefined;
    if (location) {
      return {
        type: 'location',
        placeholder: '📍 Localização',
        url: null,
        mimetype: null,
      };
    }

    const contact = messageObj.contactMessage as AnyRec | undefined;
    if (contact) {
      const name = (contact.displayName as string | undefined) ?? 'Contato';
      return {
        type: 'contact',
        placeholder: `👤 ${name}`,
        url: null,
        mimetype: null,
      };
    }

    if (item.hasMedia === true || wahaMedia) {
      return {
        type: wahaType ?? 'media',
        placeholder: '📎 Anexo',
        url: pickUrl(wahaMedia ?? undefined),
        mimetype: pickMime(wahaMedia ?? undefined),
      };
    }

    return null;
  }

  private mapState(raw: string): WhatsappInstanceStatus {
    const s = raw.toUpperCase();
    // WAHA states
    if (s === 'WORKING') return WhatsappInstanceStatus.CONNECTED;
    if (s === 'SCAN_QR_CODE') return WhatsappInstanceStatus.QR_PENDING;
    if (s === 'STARTING') return WhatsappInstanceStatus.CONNECTING;
    if (s === 'STOPPED') return WhatsappInstanceStatus.DISCONNECTED;
    if (s === 'FAILED') return WhatsappInstanceStatus.ERROR;
    // Evolution compat (legacy)
    if (s === 'OPEN' || s === 'CONNECTED')
      return WhatsappInstanceStatus.CONNECTED;
    if (s === 'CONNECTING' || s === 'SYNCING')
      return WhatsappInstanceStatus.CONNECTING;
    if (s === 'QR' || s === 'QRCODE' || s === 'QRCODE_UPDATED')
      return WhatsappInstanceStatus.QR_PENDING;
    if (s === 'CLOSE' || s === 'CLOSED' || s === 'DISCONNECTED')
      return WhatsappInstanceStatus.DISCONNECTED;
    if (!raw) return WhatsappInstanceStatus.DISCONNECTED;
    return WhatsappInstanceStatus.ERROR;
  }

  private mapMessageStatus(raw: string): MessageStatus | null {
    switch (raw) {
      case 'PENDING':
        return MessageStatus.PENDING;
      case 'SERVER_ACK':
      case 'SENT':
        return MessageStatus.SENT;
      case 'DELIVERY_ACK':
      case 'DELIVERED':
        return MessageStatus.DELIVERED;
      case 'READ':
        return MessageStatus.READ;
      case 'ERROR':
      case 'FAILED':
        return MessageStatus.FAILED;
      default:
        return null;
    }
  }

  // ===========================================================
  // Phase 2 — Send media / reply / mention / reaction
  // ===========================================================

  /**
   * Envio genérico de mídia. `kind` decide qual endpoint WAHA chamar; o body
   * espera `file.url` (URL pública pra WAHA baixar) OU `file.data` (base64).
   * `caption` é opcional, exceto pra audio/voice. `replyTo` recebe o externalId
   * da mensagem que está sendo respondida.
   */
  async sendMedia(
    companyId: string,
    to: string,
    kind: 'image' | 'video' | 'voice' | 'file',
    file: { url?: string; data?: string; mimetype?: string; filename?: string },
    options?: {
      caption?: string;
      replyTo?: string;
      customerId?: string | null;
    },
  ): Promise<WhatsappMessageEntity> {
    const inst = await this.requireConnected(companyId);
    const chatId = jidFromPeerKey(to);
    const session = this.wahaSessionFor(inst);
    const placeholderByKind: Record<typeof kind, string> = {
      image: '📷 Imagem',
      video: '🎥 Vídeo',
      voice: '🎙️ Mensagem de voz',
      file: '📎 Arquivo',
    };
    const log = await this.prisma.messageLog.create({
      data: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        direction: 'OUTBOUND',
        toAddress: chatId,
        body: options?.caption?.trim() || placeholderByKind[kind],
        status: MessageStatus.PENDING,
        customerId: options?.customerId ?? null,
        metadataJson: {
          kind: 'waha-media',
          mediaType: kind,
          mediaUrl: file.url ?? null,
          mediaMimetype: file.mimetype ?? null,
          ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
        },
      },
    });
    try {
      let result: import('./waha-api.client').WahaSendResult;
      if (kind === 'image') {
        result = await this.waha.sendImage(
          session,
          chatId,
          file,
          options?.caption,
          options?.replyTo,
        );
      } else if (kind === 'video') {
        result = await this.waha.sendVideo(
          session,
          chatId,
          file,
          options?.caption,
          options?.replyTo,
        );
      } else if (kind === 'voice') {
        result = await this.waha.sendVoice(
          session,
          chatId,
          file,
          options?.replyTo,
        );
      } else {
        result = await this.waha.sendFile(
          session,
          chatId,
          file,
          options?.caption,
          options?.replyTo,
        );
      }
      const updated = await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.SENT,
          externalId: extractExternalId(result),
          sentAt: new Date(),
        },
      });
      const entity = mapMessage(updated);
      this.pubsub.publish(WHATSAPP_MESSAGE_UPDATED, {
        whatsappMessageUpdated: { ...entity, companyId },
      });
      return entity;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: message.slice(0, 500),
        },
      });
      throw new BadRequestException(`Falha ao enviar ${kind}: ${message}`);
    }
  }

  async sendLocation(
    companyId: string,
    to: string,
    latitude: number,
    longitude: number,
    title?: string,
  ): Promise<WhatsappMessageEntity> {
    const inst = await this.requireConnected(companyId);
    const chatId = jidFromPeerKey(to);
    const log = await this.prisma.messageLog.create({
      data: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        direction: 'OUTBOUND',
        toAddress: chatId,
        body: title ? `📍 ${title}` : '📍 Localização',
        status: MessageStatus.PENDING,
        metadataJson: {
          kind: 'waha-location',
          mediaType: 'location',
          latitude,
          longitude,
          title,
        },
      },
    });
    try {
      const res = await this.waha.sendLocation(
        this.wahaSessionFor(inst),
        chatId,
        latitude,
        longitude,
        title,
      );
      const updated = await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.SENT,
          externalId: extractExternalId(res),
          sentAt: new Date(),
        },
      });
      const entity = mapMessage(updated);
      this.pubsub.publish(WHATSAPP_MESSAGE_UPDATED, {
        whatsappMessageUpdated: { ...entity, companyId },
      });
      return entity;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: message.slice(0, 500),
        },
      });
      throw new BadRequestException(`Falha ao enviar localização: ${message}`);
    }
  }

  /**
   * Reage a uma mensagem com emoji. Passe string vazia pra remover. WAHA não
   * gera um messageLog separado — armazenamos a reação em metadata da msg
   * original pra o front renderizar embaixo do balão.
   */
  async reactToMessage(
    companyId: string,
    messageId: string,
    reaction: string,
  ): Promise<boolean> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (!log.externalId) {
      throw new BadRequestException(
        'Mensagem ainda não foi enviada ao WhatsApp (sem externalId).',
      );
    }
    const inst = await this.requireConnected(companyId);
    const meta = (log.metadataJson ?? {}) as Record<string, unknown>;
    const remoteJid = (meta.remoteJid as string | undefined) ?? log.toAddress;
    await this.waha.sendReaction(
      this.wahaSessionFor(inst),
      jidFromPeerKey(remoteJid),
      log.externalId,
      reaction,
    );
    await this.prisma.messageLog.update({
      where: { id: messageId },
      data: {
        metadataJson: {
          ...meta,
          myReaction: reaction || null,
        } as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  // ===========================================================
  // Phase 3 — Typing / presence
  // ===========================================================

  async setTyping(
    companyId: string,
    peerNumber: string,
    typing: boolean,
  ): Promise<boolean> {
    const inst = await this.requireConnected(companyId);
    const chatId = jidFromPeerKey(peerNumber);
    if (typing) {
      await this.waha.startTyping(this.wahaSessionFor(inst), chatId);
    } else {
      await this.waha.stopTyping(this.wahaSessionFor(inst), chatId);
    }
    return true;
  }

  async getPeerPresence(
    companyId: string,
    peerNumber: string,
  ): Promise<{ presence: string | null; lastSeen: Date | null } | null> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (inst?.status !== WhatsappInstanceStatus.CONNECTED) return null;
    const chatId = jidFromPeerKey(peerNumber);
    const session = this.wahaSessionFor(inst);
    // subscribe garante que próximas atualizações chegam por webhook
    await this.waha.subscribePresence(session, chatId);
    const res = await this.waha.getPresence(session, chatId);
    if (!res) return { presence: null, lastSeen: null };
    return {
      presence: res.presence ?? null,
      lastSeen:
        typeof res.lastSeen === 'number' ? new Date(res.lastSeen * 1000) : null,
    };
  }

  // ===========================================================
  // Phase 4 — CRM lateral (about / checkExists / block / LID)
  // ===========================================================

  async getContactAbout(
    companyId: string,
    peerNumber: string,
  ): Promise<string | null> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (inst?.status !== WhatsappInstanceStatus.CONNECTED) return null;
    return this.waha.getContactAbout(
      this.wahaSessionFor(inst),
      jidFromPeerKey(peerNumber),
    );
  }

  async checkPhoneOnWhatsapp(
    companyId: string,
    phone: string,
  ): Promise<{ exists: boolean; chatId: string | null }> {
    const inst = await this.requireConnected(companyId);
    const digits = normalizePhone(phone);
    const res = await this.waha.checkContactExists(
      this.wahaSessionFor(inst),
      digits,
    );
    return {
      exists: !!res?.numberExists,
      chatId: res?.chatId ?? null,
    };
  }

  async blockContact(
    companyId: string,
    peerNumber: string,
    block: boolean,
  ): Promise<boolean> {
    const inst = await this.requireConnected(companyId);
    const chatId = jidFromPeerKey(peerNumber);
    if (block) {
      await this.waha.blockContact(this.wahaSessionFor(inst), chatId);
    } else {
      await this.waha.unblockContact(this.wahaSessionFor(inst), chatId);
    }
    return true;
  }

  async getGroupParticipants(
    companyId: string,
    peerNumber: string,
  ): Promise<{ jid: string; phone: string; isAdmin: boolean }[]> {
    if (!isGroupJid(peerNumber)) return [];
    const inst = await this.requireConnected(companyId);
    const list = await this.waha.getGroupParticipants(
      this.wahaSessionFor(inst),
      peerNumber,
    );
    return list.flatMap((p) => {
      if (typeof p.id !== 'string' || p.id.length === 0) return [];
      const jid: string = p.id;
      return [
        {
          jid,
          phone: phoneFromJid(jid),
          isAdmin: !!p.isAdmin || !!p.isSuperAdmin,
        },
      ];
    });
  }

  // ===========================================================
  // Phase 6 — Timeline / Media summary / CRM cache (tags, notas, status)
  // ===========================================================

  async getActivityTimeline(
    companyId: string,
    peerNumber: string,
    limit = 30,
  ): Promise<
    Array<{
      id: string;
      type: string;
      at: Date;
      description: string | null;
      actor: string | null;
      icon: string | null;
    }>
  > {
    const where = {
      companyId,
      channel: NotificationChannel.WHATSAPP,
      ...this.buildPeerWhere(peerNumber),
    };
    const messages = await this.prisma.messageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { customer: { select: { name: true } } },
    });
    return messages.map((m) => {
      const meta = (m.metadataJson ?? {}) as Record<string, unknown>;
      let type = 'message';
      let icon = m.direction === 'OUTBOUND' ? 'send' : 'inbox';
      let description: string | null =
        m.body.slice(0, 80) + (m.body.length > 80 ? '…' : '');

      if (meta.kind === 'call') {
        type = 'call';
        icon = meta.callType === 'video' ? 'video' : 'phone';
        description =
          meta.callType === 'video' ? 'Chamada de vídeo' : 'Chamada de voz';
      } else if (meta.isRevoked) {
        type = 'revoked';
        icon = 'trash';
        description = 'Mensagem apagada';
      } else if (meta.isEdited) {
        type = 'edited';
        icon = 'edit';
        description = 'Mensagem editada';
      } else if (meta.mediaType) {
        type = 'media';
        icon = String(meta.mediaType);
      } else if (meta.kind === 'forward') {
        type = 'forward';
        icon = 'share';
      }

      const actor = m.fromAddress
        ? ((meta.pushName as string | undefined) ??
          (m.customer?.name as string | undefined) ??
          (m.direction === 'OUTBOUND' ? 'Você' : 'Contato'))
        : 'Você';

      return {
        id: m.id,
        type,
        at: m.createdAt,
        description,
        actor,
        icon,
      };
    });
  }

  async getMediaSummary(
    companyId: string,
    peerNumber: string,
  ): Promise<{
    images: number;
    videos: number;
    audios: number;
    documents: number;
    stickers: number;
    locations: number;
  }> {
    const where = {
      companyId,
      channel: NotificationChannel.WHATSAPP,
      ...this.buildPeerWhere(peerNumber),
    };
    const messages = await this.prisma.messageLog.findMany({
      where,
      select: { metadataJson: true },
      take: 5000,
    });
    const summary = {
      images: 0,
      videos: 0,
      audios: 0,
      documents: 0,
      stickers: 0,
      locations: 0,
    };
    for (const m of messages) {
      const meta = (m.metadataJson ?? {}) as Record<string, unknown>;
      const mt = meta.mediaType as string | undefined;
      if (!mt) continue;
      if (mt === 'image') summary.images++;
      else if (mt === 'video') summary.videos++;
      else if (mt === 'audio' || mt === 'ptt') summary.audios++;
      else if (mt === 'document') summary.documents++;
      else if (mt === 'sticker') summary.stickers++;
      else if (mt === 'location') summary.locations++;
    }
    return summary;
  }

  /**
   * Atualiza o cache CRM (tags / notas / status / responsável) no metadata da
   * mensagem mais recente do peer. Não cria coluna dedicada por enquanto pra
   * minimizar mudanças de schema; trade-off: a query reaproveita o cache do
   * `last` no `getContact`.
   */
  async updateContactCrm(
    companyId: string,
    peerNumber: string,
    patch: {
      tags?: string[];
      internalNotes?: string | null;
      conversationStatus?: string | null;
      assignedUserId?: string | null;
      assignedUserName?: string | null;
    },
  ): Promise<boolean> {
    const last = await this.prisma.messageLog.findFirst({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        ...this.buildPeerWhere(peerNumber),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) {
      throw new BadRequestException(
        'Nenhuma mensagem ainda — abra a conversa antes de editar atributos CRM.',
      );
    }
    const baseMeta = (last.metadataJson ?? {}) as Record<string, unknown>;
    const crmCache =
      (baseMeta.crmCache as Record<string, unknown> | undefined) ?? {};
    const merged = {
      ...crmCache,
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.internalNotes !== undefined
        ? { internalNotes: patch.internalNotes }
        : {}),
      ...(patch.conversationStatus !== undefined
        ? { conversationStatus: patch.conversationStatus }
        : {}),
      ...(patch.assignedUserId !== undefined
        ? { assignedUserId: patch.assignedUserId }
        : {}),
      ...(patch.assignedUserName !== undefined
        ? { assignedUserName: patch.assignedUserName }
        : {}),
      updatedAt: Date.now(),
    };
    await this.prisma.messageLog.update({
      where: { id: last.id },
      data: {
        metadataJson: {
          ...baseMeta,
          crmCache: merged,
        } as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  // ===========================================================
  // Phase 5 — Edit / delete / star / pin / forward
  // ===========================================================

  async editWhatsappMessage(
    companyId: string,
    messageId: string,
    newBody: string,
  ): Promise<WhatsappMessageEntity> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (!log.externalId) {
      throw new BadRequestException(
        'Mensagem sem externalId — não pode ser editada.',
      );
    }
    const inst = await this.requireConnected(companyId);
    const meta = (log.metadataJson ?? {}) as Record<string, unknown>;
    const remoteJid = (meta.remoteJid as string | undefined) ?? log.toAddress;
    await this.waha.editMessage(
      this.wahaSessionFor(inst),
      jidFromPeerKey(remoteJid),
      log.externalId,
      newBody,
    );
    const updated = await this.prisma.messageLog.update({
      where: { id: messageId },
      data: {
        body: newBody,
        metadataJson: {
          ...meta,
          isEdited: true,
          editedAt: Date.now(),
          originalBody: meta.originalBody ?? log.body,
        } as Prisma.InputJsonValue,
      },
    });
    return mapMessage(updated);
  }

  async deleteWhatsappMessage(
    companyId: string,
    messageId: string,
  ): Promise<boolean> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (!log.externalId) {
      throw new BadRequestException(
        'Mensagem sem externalId — não pode ser apagada.',
      );
    }
    const inst = await this.requireConnected(companyId);
    const meta = (log.metadataJson ?? {}) as Record<string, unknown>;
    const remoteJid = (meta.remoteJid as string | undefined) ?? log.toAddress;
    await this.waha.deleteMessage(
      this.wahaSessionFor(inst),
      jidFromPeerKey(remoteJid),
      log.externalId,
    );
    await this.prisma.messageLog.update({
      where: { id: messageId },
      data: {
        body: '🚫 Esta mensagem foi apagada',
        metadataJson: {
          ...meta,
          isRevoked: true,
          revokedAt: Date.now(),
        } as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  async starWhatsappMessage(
    companyId: string,
    messageId: string,
    star: boolean,
  ): Promise<boolean> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (!log.externalId) return false;
    const inst = await this.requireConnected(companyId);
    const meta = (log.metadataJson ?? {}) as Record<string, unknown>;
    const remoteJid = (meta.remoteJid as string | undefined) ?? log.toAddress;
    await this.waha.starMessage(
      this.wahaSessionFor(inst),
      jidFromPeerKey(remoteJid),
      log.externalId,
      star,
    );
    await this.prisma.messageLog.update({
      where: { id: messageId },
      data: {
        metadataJson: { ...meta, starred: star } as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  async pinWhatsappMessage(
    companyId: string,
    messageId: string,
    pin: boolean,
  ): Promise<boolean> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (!log.externalId) return false;
    const inst = await this.requireConnected(companyId);
    const meta = (log.metadataJson ?? {}) as Record<string, unknown>;
    const remoteJid = (meta.remoteJid as string | undefined) ?? log.toAddress;
    if (pin) {
      await this.waha.pinMessage(
        this.wahaSessionFor(inst),
        jidFromPeerKey(remoteJid),
        log.externalId,
      );
    } else {
      await this.waha.unpinMessage(
        this.wahaSessionFor(inst),
        jidFromPeerKey(remoteJid),
        log.externalId,
      );
    }
    await this.prisma.messageLog.update({
      where: { id: messageId },
      data: { metadataJson: { ...meta, pinned: pin } as Prisma.InputJsonValue },
    });
    return true;
  }

  async forwardWhatsappMessage(
    companyId: string,
    messageId: string,
    toPeerNumber: string,
  ): Promise<WhatsappMessageEntity> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (!log.externalId) {
      throw new BadRequestException(
        'Mensagem sem externalId — não pode ser encaminhada.',
      );
    }
    const inst = await this.requireConnected(companyId);
    const targetChat = jidFromPeerKey(toPeerNumber);
    const result = await this.waha.forwardMessage(
      this.wahaSessionFor(inst),
      targetChat,
      log.externalId,
    );
    const created = await this.prisma.messageLog.create({
      data: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        direction: 'OUTBOUND',
        toAddress: targetChat,
        body: log.body,
        status: MessageStatus.SENT,
        externalId: extractExternalId(result),
        sentAt: new Date(),
        metadataJson: {
          kind: 'forward',
          forwardedFrom: log.id,
        } as Prisma.InputJsonValue,
      },
    });
    const entity = mapMessage(created);
    this.pubsub.publish(WHATSAPP_MESSAGE_RECEIVED, {
      whatsappMessageReceived: { ...entity, companyId },
    });
    return entity;
  }

  async archiveWhatsappChat(
    companyId: string,
    peerNumber: string,
    archive: boolean,
  ): Promise<boolean> {
    const inst = await this.requireConnected(companyId);
    await this.waha.archiveChat(
      this.wahaSessionFor(inst),
      jidFromPeerKey(peerNumber),
      archive,
    );
    return true;
  }

  // ===========================================================
  // Helpers
  // ===========================================================

  /**
   * Avalia o chatbot pro peer. Se há regra que matcha, envia a resposta como
   * outbound e loga o disparo. `instanceName` é usado pra wahaSessionFor.
   * Roda em background — falhas não interrompem o webhook.
   */
  private async runChatbotForIncoming(
    companyId: string,
    peer: string,
    text: string,
    instanceName: string,
  ): Promise<void> {
    const previousCount = await this.prisma.messageLog.count({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
        ...this.buildPeerWhere(peer),
      },
    });
    const isFirstMessage = previousCount <= 1; // a recém-criada conta como 1

    const match = await this.chatbot.findMatchingRule({
      companyId,
      peerNumber: peer,
      text,
      isFirstMessage,
    });
    if (!match) return;

    this.logger.log(
      `Chatbot match: peer=${peer} regra=${match.rule.id} → respondendo`,
    );
    try {
      await this.sendText(companyId, peer, match.rule.responseBody, null);
      await this.chatbot.logFire(companyId, match.rule.id, peer, text);

      // Aplica tags da regra ao contato
      if (match.rule.applyTags.length > 0) {
        await this.updateContactCrm(companyId, peer, {
          tags: match.rule.applyTags,
        }).catch(() => undefined);
      }
    } catch (err) {
      this.logger.warn(
        `Chatbot falhou ao enviar resposta: ${err instanceof Error ? err.message : err}`,
      );
    }
    // instanceName é mantido na assinatura pra futuros ajustes (rate limit por sessão).
    void instanceName;
  }

  private async requireConnected(companyId: string): Promise<RawInstance> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (!inst || inst.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp não está conectado.');
    }
    return inst;
  }

  async requireInstance(companyId: string): Promise<RawInstance> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (!inst) throw new NotFoundException('Sessão WhatsApp não encontrada.');
    return inst;
  }
}
