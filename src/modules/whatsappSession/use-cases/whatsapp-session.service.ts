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
  WhatsappConversationEntity,
  WhatsappInstanceEntity,
  WhatsappMessageEntity,
} from '../entities/whatsapp-session.entity';
import { EvolutionApiClient } from './evolution-api.client';

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
    private readonly evolution: EvolutionApiClient,
  ) {}

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
    try {
      const state = await this.evolution.connectionState(inst.instanceName);
      const raw = (state.instance?.state ?? state.state ?? '').toLowerCase();
      const status = this.mapState(raw);
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

    // Garante que existe na Evolution; se não, cria
    try {
      await this.evolution.connectionState(inst.instanceName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('404') ||
        message.toLowerCase().includes('not found')
      ) {
        await this.evolution.createInstance(inst.instanceName);
      }
    }

    // Configura webhook num passo dedicado (idempotente)
    try {
      const result = await this.evolution.setWebhook(inst.instanceName);
      this.logger.log(
        `Webhook registrado em ${inst.instanceName} (${result.format})`,
      );
    } catch (err) {
      this.logger.warn(
        `setWebhook falhou: ${err instanceof Error ? err.message : err}`,
      );
    }

    // Pede QR
    let qrDataUrl: string | null = null;
    try {
      const qr = await this.evolution.connectInstance(inst.instanceName);
      const raw = qr.base64 ?? qr.qrcode ?? qr.code ?? null;
      if (raw) {
        qrDataUrl = raw.startsWith('data:')
          ? raw
          : `data:image/png;base64,${raw}`;
      }
    } catch (err) {
      this.logger.warn(`connect QR falhou: ${err instanceof Error ? err.message : err}`);
    }

    const status = qrDataUrl
      ? WhatsappInstanceStatus.QR_PENDING
      : WhatsappInstanceStatus.CONNECTING;

    const updated = await this.prisma.whatsappInstance.update({
      where: { id: inst.id },
      data: {
        status,
        qrCode: qrDataUrl,
        lastError: null,
      },
    });

    // Atualiza status real (caso já esteja conectado)
    return this.refreshStatus(companyId).catch(() => toEntity(updated));
  }

  async reconfigureWebhook(
    companyId: string,
  ): Promise<{ ok: boolean; format: string | null; webhookUrl: string | null }> {
    const inst = await this.getOrCreateInstance(companyId);
    const url = this.evolution.buildWebhookUrl(inst.instanceName);
    const result = await this.evolution.setWebhook(inst.instanceName);
    return { ok: result.ok, format: result.format ?? null, webhookUrl: url };
  }

  async getWebhookConfigFromEvolution(companyId: string): Promise<string> {
    const inst = await this.getOrCreateInstance(companyId);
    const result = await this.evolution.getWebhookConfig(inst.instanceName);
    return JSON.stringify(result, null, 2);
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

    let raw: unknown;
    try {
      raw = await this.evolution.findMessages(inst.instanceName, remoteJid, limit);
    } catch (err) {
      this.logger.warn(
        `findMessages falhou: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }

    // Evolution v2 retorna várias formas: { messages: { records: [] } }, { messages: [] }, ou array direto
    const flatten = (input: unknown): Record<string, unknown>[] => {
      if (Array.isArray(input)) return input as Record<string, unknown>[];
      if (input && typeof input === 'object') {
        const obj = input as Record<string, unknown>;
        if (Array.isArray(obj.messages)) {
          return obj.messages as Record<string, unknown>[];
        }
        if (
          obj.messages &&
          typeof obj.messages === 'object' &&
          Array.isArray((obj.messages as Record<string, unknown>).records)
        ) {
          return (obj.messages as Record<string, unknown>).records as Record<
            string,
            unknown
          >[];
        }
        if (Array.isArray(obj.records)) {
          return obj.records as Record<string, unknown>[];
        }
      }
      return [];
    };

    const items = flatten(raw);
    let imported = 0;

    for (const item of items) {
      const key = (item.key ?? {}) as Record<string, unknown>;
      const externalId = (key.id as string | undefined) ?? null;
      const fromMe = !!key.fromMe;
      if (externalId) {
        const existing = await this.prisma.messageLog.findFirst({
          where: { externalId, companyId },
          select: { id: true },
        });
        if (existing) continue;
      }

      const messageObj = (item.message ?? {}) as Record<string, unknown>;
      const text =
        (messageObj.conversation as string | undefined) ??
        ((messageObj.extendedTextMessage as
          | Record<string, unknown>
          | undefined)?.text as string | undefined) ??
        (item.body as string | undefined) ??
        '';
      if (!text) continue;

      const ts = item.messageTimestamp;
      const createdAt =
        typeof ts === 'number'
          ? new Date(ts * 1000)
          : typeof ts === 'string' && /^\d+$/.test(ts)
            ? new Date(Number(ts) * 1000)
            : new Date();

      const pushName = (item.pushName as string | undefined) ?? null;

      const participant = (key.participant as string | undefined) ?? null;
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
            participant,
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
    let raw: unknown;
    try {
      raw = await this.evolution.findChats(inst.instanceName);
    } catch (err) {
      this.logger.warn(
        `findChats falhou: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }
    const list: Record<string, unknown>[] = Array.isArray(raw)
      ? (raw as Record<string, unknown>[])
      : Array.isArray((raw as { chats?: unknown })?.chats)
        ? ((raw as { chats: Record<string, unknown>[] }).chats)
        : [];

    let count = 0;
    for (const chat of list) {
      const remoteJid =
        (chat.id as string | undefined) ??
        (chat.remoteJid as string | undefined);
      if (!remoteJid) continue;
      const isGroup = isGroupJid(remoteJid);
      const peerKey = peerKeyFromJid(remoteJid);
      if (!peerKey) continue;
      const pushName =
        (chat.name as string | undefined) ??
        (chat.subject as string | undefined) ??
        (chat.pushName as string | undefined) ??
        null;
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
            : '— conversa importada do WhatsApp —',
          status: MessageStatus.READ,
          metadataJson: { pushName, source: 'sync', remoteJid, isGroup },
        },
      });
      count++;
    }
    return count;
  }

  async disconnect(companyId: string): Promise<WhatsappInstanceEntity> {
    const inst = await this.getOrCreateInstance(companyId);
    try {
      await this.evolution.logoutInstance(inst.instanceName);
    } catch (err) {
      this.logger.warn(
        `logout falhou: ${err instanceof Error ? err.message : err}`,
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

    // Se for JID de grupo, manda como está; senão sanitiza pra dígitos
    const target = isGroupJid(to) ? to : normalizePhone(to);
    if (!isGroupJid(to) && target.length < 10) {
      throw new BadRequestException('Telefone inválido.');
    }
    const phone = target;
    this.logger.log(
      `sendText: ${inst.instanceName} → ${phone} (${body.length} chars)`,
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
        metadataJson: { kind: 'evolution-direct' },
      },
    });

    try {
      const result = await this.evolution.sendText(
        inst.instanceName,
        phone,
        body,
      );
      const externalId = result.key?.id ?? null;
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
      this.logger.error(`sendText falhou em ${inst.instanceName}: ${message}`);
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

  // ---------- Webhook handling ----------

  async handleWebhook(
    instanceName: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
    });
    if (!inst) {
      this.logger.warn(`Webhook para instância desconhecida: ${instanceName}`);
      return;
    }

    const normalizedEvent = event.toLowerCase().replace(/_/g, '.');

    if (
      normalizedEvent === 'connection.update' ||
      normalizedEvent === 'qrcode.updated'
    ) {
      const data = (payload.data ?? payload) as Record<string, unknown>;
      const stateRaw =
        typeof data.state === 'string' ? data.state.toLowerCase() : '';
      const status = this.mapState(stateRaw);
      const qrRaw =
        (typeof data.qrcode === 'object' && data.qrcode !== null
          ? ((data.qrcode as Record<string, unknown>).base64 as string | undefined)
          : undefined) ?? (data.base64 as string | undefined);
      const phone =
        (data.wuid as string | undefined) ??
        (data.profileName as string | undefined);
      await this.prisma.whatsappInstance.update({
        where: { id: inst.id },
        data: {
          status,
          ...(qrRaw
            ? {
                qrCode: qrRaw.startsWith('data:')
                  ? qrRaw
                  : `data:image/png;base64,${qrRaw}`,
              }
            : status === WhatsappInstanceStatus.CONNECTED
              ? { qrCode: null }
              : {}),
          ...(typeof phone === 'string' && phone ? { phone } : {}),
          ...(status === WhatsappInstanceStatus.CONNECTED && !inst.connectedAt
            ? { connectedAt: new Date() }
            : {}),
          lastSeenAt: new Date(),
        },
      });
      return;
    }

    if (normalizedEvent === 'messages.upsert') {
      const dataObj = (payload.data ?? payload) as Record<string, unknown>;
      const items: Record<string, unknown>[] = Array.isArray(dataObj.messages)
        ? (dataObj.messages as Record<string, unknown>[])
        : Array.isArray(payload.messages)
          ? (payload.messages as Record<string, unknown>[])
          : [dataObj];

      for (const item of items) {
        const key = (item.key ?? {}) as Record<string, unknown>;
        const fromMe = !!key.fromMe;
        const remoteJid = (key.remoteJid as string | undefined) ?? '';
        const participant = (key.participant as string | undefined) ?? null;
        const externalId = (key.id as string | undefined) ?? null;
        const messageObj = (item.message ?? {}) as Record<string, unknown>;
        const text =
          (messageObj.conversation as string | undefined) ??
          ((messageObj.extendedTextMessage as Record<string, unknown> | undefined)
            ?.text as string | undefined) ??
          ((messageObj.imageMessage as Record<string, unknown> | undefined)
            ?.caption as string | undefined) ??
          ((messageObj.videoMessage as Record<string, unknown> | undefined)
            ?.caption as string | undefined) ??
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
        const peer = peerKeyFromJid(remoteJid); // mantém @g.us em grupos
        const pushName = (item.pushName as string | undefined) ?? null;
        const ts = item.messageTimestamp;
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

    if (normalizedEvent === 'messages.update') {
      const dataObj = (payload.data ?? payload) as Record<string, unknown>;
      const items: Record<string, unknown>[] = Array.isArray(dataObj.messages)
        ? (dataObj.messages as Record<string, unknown>[])
        : [dataObj];
      for (const item of items) {
        const key = (item.key ?? {}) as Record<string, unknown>;
        const externalId = key.id as string | undefined;
        const update = (item.update ?? item) as Record<string, unknown>;
        const status = (update.status as string | undefined)?.toUpperCase();
        if (!externalId || !status) continue;
        const mapped = this.mapMessageStatus(status);
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
    if (raw === 'open' || raw === 'connected')
      return WhatsappInstanceStatus.CONNECTED;
    if (raw === 'connecting' || raw === 'syncing')
      return WhatsappInstanceStatus.CONNECTING;
    if (raw === 'qr' || raw === 'qrcode' || raw === 'qrcode_updated')
      return WhatsappInstanceStatus.QR_PENDING;
    if (raw === 'close' || raw === 'closed' || raw === 'disconnected')
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

  async requireInstance(companyId: string): Promise<RawInstance> {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { companyId },
    });
    if (!inst) throw new NotFoundException('Sessão WhatsApp não encontrada.');
    return inst;
  }
}
