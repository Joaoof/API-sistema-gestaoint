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
import { WahaApiClient } from './waha-api.client';

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
 * Para individuais → retorna telefone (só dígitos).
 * Para grupos → retorna o JID completo (`xxxx-yyy@g.us`) como "peerNumber".
 * Isso preserva a distinção e permite reconstruir o JID ao enviar.
 */
function peerKeyFromJid(jid: string | null | undefined): string {
  if (!jid) return '';
  if (isGroupJid(jid)) return jid;
  const at = jid.indexOf('@');
  return at >= 0 ? jid.slice(0, at) : jid;
}

function jidFromPeerKey(peerKey: string): string {
  if (peerKey.endsWith('@g.us') || peerKey.endsWith('@s.whatsapp.net')) {
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
    participantNumber:
      (meta.participant as string | undefined)
        ? phoneFromJid(meta.participant as string)
        : null,
    participantName:
      (meta.participantName as string | undefined) ??
      (meta.pushName as string | undefined) ??
      null,
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

  async connect(companyId: string): Promise<WhatsappInstanceEntity> {
    const inst = await this.getOrCreateInstance(companyId);
    const sessionName = this.wahaSessionFor(inst);
    const webhookUrl = this.waha.buildWebhookUrl(sessionName);

    // 1. Garantir que a sessão exista no WAHA. Em alguns estados ela precisa
    //    ser recriada/reiniciada antes de fornecer QR.
    let needsCreate = false;
    let needsStart = false;
    try {
      const session = await this.waha.getSession(sessionName);
      const st = session.status ?? '';
      if (st === 'STOPPED' || st === 'FAILED') {
        // tenta dar start; se não rolar, recria
        needsStart = true;
      }
      if (webhookUrl) {
        await this.waha
          .updateSessionWebhook(sessionName, webhookUrl)
          .catch((err) =>
            this.logger.warn(
              `updateSessionWebhook falhou: ${err instanceof Error ? err.message : err}`,
            ),
          );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        needsCreate = true;
      } else {
        throw err;
      }
    }

    if (needsCreate) {
      try {
        await this.waha.createSession(sessionName, webhookUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`createSession falhou: ${message}`);
        throw err;
      }
    } else if (needsStart) {
      try {
        await this.waha.startSession(sessionName);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `startSession falhou (${message}); tentando recriar a sessão`,
        );
        await this.waha.deleteSession(sessionName).catch(() => null);
        await this.waha.createSession(sessionName, webhookUrl);
      }
    }

    // 2. Polling: aguarda WAHA chegar em SCAN_QR_CODE (ou WORKING) e busca o QR
    //    Tenta ~12s no total (24 × 500ms) — suficiente em redes normais.
    let qrDataUrl: string | null = null;
    let finalStatus: string = '';
    for (let i = 0; i < 24; i++) {
      try {
        const s = await this.waha.getSession(sessionName);
        finalStatus = s.status ?? '';

        if (finalStatus === 'WORKING') break;

        if (finalStatus === 'SCAN_QR_CODE') {
          try {
            const qr = await this.waha.getQr(sessionName);
            const raw = qr.value ?? null;
            if (raw) {
              qrDataUrl = raw.startsWith('data:')
                ? raw
                : `data:image/png;base64,${raw}`;
              break;
            }
          } catch (err) {
            this.logger.debug(
              `getQr ainda não pronto: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      } catch (err) {
        this.logger.debug(
          `polling getSession: ${err instanceof Error ? err.message : err}`,
        );
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!qrDataUrl && finalStatus !== 'WORKING') {
      this.logger.warn(
        `connect terminou sem QR. Último estado WAHA: "${finalStatus || 'desconhecido'}". Tente novamente em alguns segundos.`,
      );
    }

    const status =
      finalStatus === 'WORKING'
        ? WhatsappInstanceStatus.CONNECTED
        : qrDataUrl
          ? WhatsappInstanceStatus.QR_PENDING
          : WhatsappInstanceStatus.CONNECTING;

    const updated = await this.prisma.whatsappInstance.update({
      where: { id: inst.id },
      data: { status, qrCode: qrDataUrl, lastError: null },
    });

    return this.refreshStatus(companyId).catch(() => toEntity(updated));
  }

  async reconfigureWebhook(
    companyId: string,
  ): Promise<{ ok: boolean; format: string | null; webhookUrl: string | null }> {
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
          toAddress: fromMe ? phone : (isGroup ? phone : ''),
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
      this.logger.log(`syncFromEvolution: ${skippedOther} broadcast/newsletter pulados`);
    }
    return count;
  }

  async disconnect(companyId: string): Promise<WhatsappInstanceEntity> {
    const inst = await this.getOrCreateInstance(companyId);
    try {
      await this.waha.stopSession(this.wahaSessionFor(inst));
    } catch (err) {
      this.logger.warn(
        `stopSession falhou: ${err instanceof Error ? err.message : err}`,
      );
    }
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
    const phone = target;
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
        metadataJson: { kind: 'waha-direct' },
      },
    });

    try {
      // WAHA espera chatId no formato JID completo
      const chatId = isJid ? phone : `${phone}@s.whatsapp.net`;
      const result = await this.waha.sendText(sessionName, chatId, body);
      const externalId = result.id ?? null;
      const updated = await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.SENT,
          externalId,
          sentAt: new Date(),
        },
      });
      return mapMessage(updated);
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

  async listConversations(
    companyId: string,
  ): Promise<WhatsappConversationEntity[]> {
    const messages = await this.prisma.messageLog.findMany({
      where: {
        companyId,
        channel: NotificationChannel.WHATSAPP,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
      },
      take: 2000,
    });

    const groups = new Map<
      string,
      {
        peerNumber: string;
        peerName: string | null;
        customerId: string | null;
        lastMessage: string | null;
        lastMessageAt: Date | null;
        unreadCount: number;
        totalMessages: number;
        isGroup: boolean;
        isHiddenNumber: boolean;
      }
    >();

    for (const m of messages) {
      const meta = (m.metadataJson ?? {}) as Record<string, unknown>;
      // Prioriza remoteJid do metadata (preserva @g.us); senão usa toAddress/fromAddress
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

      const existing = groups.get(peer);
      if (!existing) {
        groups.set(peer, {
          peerNumber: peer,
          peerName: pushName ?? m.customer?.name ?? null,
          customerId: m.customerId ?? null,
          lastMessage: m.body,
          lastMessageAt: m.createdAt,
          unreadCount:
            m.direction === 'INBOUND' && m.status !== MessageStatus.READ
              ? 1
              : 0,
          totalMessages: 1,
          isGroup,
          isHiddenNumber,
        });
      } else {
        existing.totalMessages += 1;
        if (m.direction === 'INBOUND' && m.status !== MessageStatus.READ) {
          existing.unreadCount += 1;
        }
        if (!existing.peerName && (pushName || m.customer?.name)) {
          existing.peerName = pushName ?? m.customer?.name ?? null;
        }
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
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
    const [first, last, total, inbound, outbound] =
      await this.prisma.$transaction([
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
      ]);

    const isGroup = isGroupJid(peerNumber);
    const baseMeta = (last?.metadataJson ??
      first?.metadataJson ??
      {}) as Record<string, unknown>;

    // Cache de profile no metadata (evita bater no Evolution toda hora)
    const profileCache =
      (baseMeta.profileCache as Record<string, unknown> | undefined) ?? {};
    const cachedAt =
      typeof profileCache.fetchedAt === 'number'
        ? profileCache.fetchedAt
        : 0;
    const STALE_MS = 24 * 60 * 60 * 1000; // 24h
    const isStale = Date.now() - cachedAt > STALE_MS;

    let profilePicUrl =
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
        if (avatarRes.url) profilePicUrl = avatarRes.url;
        else if (avatarRes.value) profilePicUrl = avatarRes.value;

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

    const displayName =
      verifiedName ??
      (baseMeta.pushName as string | undefined) ??
      (baseMeta.subject as string | undefined) ??
      last?.customer?.name ??
      first?.customer?.name ??
      (isGroup ? 'Grupo do WhatsApp' : peerNumber);

    const customerId = last?.customerId ?? first?.customerId ?? null;
    const customerName =
      last?.customer?.name ?? first?.customer?.name ?? null;
    const phoneDigits = isGroup ? '' : normalizePhone(peerNumber);
    const phoneFormatted = isGroup ? null : phoneDigits;
    const waLink = isGroup ? '' : `https://wa.me/${phoneDigits}`;

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
      firstMessageAt: first?.createdAt ?? null,
      lastMessageAt: last?.createdAt ?? null,
      waLink,
    };
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
    const data = (payload.payload ?? payload.data ?? payload) as Record<string, unknown>;
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
        (data.me as Record<string, unknown> | undefined)?.id as string | undefined;
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
    if (normalizedEvent === 'message' || normalizedEvent === 'messages.upsert') {
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
          ((item.key as Record<string, unknown> | undefined)?.remoteJid as string | undefined) ??
          '';

        if (!remoteJid || isBroadcastJid(remoteJid) || isNewsletterJid(remoteJid)) {
          continue;
        }

        const participant =
          ((item._data as Record<string, unknown> | undefined)?.participant as string | undefined) ??
          ((item.key as Record<string, unknown> | undefined)?.participant as string | undefined) ??
          null;

        const externalId =
          ((item._data as Record<string, unknown> | undefined)?.id as Record<string, unknown> | undefined)?.id as string | undefined ??
          (item.id as string | undefined) ??
          null;

        const messageObj = (item.message ?? {}) as Record<string, unknown>;
        const text =
          (item.body as string | undefined) ??
          (messageObj.conversation as string | undefined) ??
          ((messageObj.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
          ((messageObj.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
          '';
        if (!text) continue;

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
          ((item._data as Record<string, unknown> | undefined)?.pushName as string | undefined) ??
          (item.pushName as string | undefined) ??
          null;
        const ts = item.timestamp ?? item.messageTimestamp;
        const createdAt =
          typeof ts === 'number'
            ? new Date(ts * 1000)
            : typeof ts === 'string'
              ? new Date(Number(ts) * 1000)
              : new Date();

        await this.prisma.messageLog.create({
          data: {
            companyId: inst.companyId,
            channel: NotificationChannel.WHATSAPP,
            direction: fromMe ? 'OUTBOUND' : 'INBOUND',
            toAddress: fromMe ? peer : (isGroup ? peer : ''),
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
            },
            createdAt,
            ...(fromMe ? { sentAt: createdAt } : { deliveredAt: createdAt }),
          },
        });
      }
      return;
    }

    // message.ack (WAHA) / messages.update (Evolution compat)
    if (normalizedEvent === 'message.ack' || normalizedEvent === 'messages.update') {
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
              : ((item.key as Record<string, unknown> | undefined)?.id as string | undefined);

        if (!externalId) continue;

        // WAHA ack: -1=error, 0=pending, 1=sent, 2=delivered, 3=read, 4=played
        const ackNum = typeof item.ack === 'number' ? item.ack : null;
        const statusStr = (
          (item.update as Record<string, unknown> | undefined)?.status ??
          item.status
        ) as string | undefined;

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
            ...(mapped === MessageStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
            ...(mapped === MessageStatus.READ ? { readAt: new Date() } : {}),
          },
        });
      }
    }
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
    if (s === 'OPEN' || s === 'CONNECTED') return WhatsappInstanceStatus.CONNECTED;
    if (s === 'CONNECTING' || s === 'SYNCING') return WhatsappInstanceStatus.CONNECTING;
    if (s === 'QR' || s === 'QRCODE' || s === 'QRCODE_UPDATED') return WhatsappInstanceStatus.QR_PENDING;
    if (s === 'CLOSE' || s === 'CLOSED' || s === 'DISCONNECTED') return WhatsappInstanceStatus.DISCONNECTED;
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

  async requireInstance(companyId: string): Promise<RawInstance> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (!inst) throw new NotFoundException('Sessão WhatsApp não encontrada.');
    return inst;
  }
}
