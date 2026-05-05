import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MessageStatus,
  NotificationChannel,
  NotificationSeverity,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  NOTIFICATION_CHANNEL_PORT,
  NotificationChannelPort,
} from '../ports/notification-channel.port';

export interface DispatchInternal {
  companyId: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  href?: string | null;
  entity?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | null;
}

export interface DispatchOutbound {
  companyId: string;
  channel: Exclude<NotificationChannel, 'IN_APP'>;
  toAddress: string;
  fromAddress?: string | null;
  subject?: string | null;
  body: string;
  templateKey?: string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_CHANNEL_PORT)
    private readonly channel: NotificationChannelPort,
  ) {}

  async dispatchInternal(payload: DispatchInternal): Promise<string> {
    const created = await this.prisma.notification.create({
      data: {
        companyId: payload.companyId,
        userId: payload.userId ?? null,
        type: payload.type,
        severity: payload.severity ?? NotificationSeverity.INFO,
        title: payload.title,
        message: payload.message,
        href: payload.href ?? null,
        entity: payload.entity ?? null,
        entityId: payload.entityId ?? null,
        metadataJson: payload.metadata as object | undefined,
        expiresAt: payload.expiresAt ?? null,
      },
    });
    return created.id;
  }

  async dispatchOutbound(payload: DispatchOutbound): Promise<string> {
    const log = await this.prisma.messageLog.create({
      data: {
        companyId: payload.companyId,
        channel: payload.channel,
        direction: 'OUTBOUND',
        toAddress: payload.toAddress,
        fromAddress: payload.fromAddress ?? null,
        subject: payload.subject ?? null,
        body: payload.body,
        status: MessageStatus.PENDING,
        templateKey: payload.templateKey ?? null,
        customerId: payload.customerId ?? null,
        metadataJson: payload.metadata as object | undefined,
      },
    });

    try {
      const result = await this.channel.send({
        channel: payload.channel,
        toAddress: payload.toAddress,
        fromAddress: payload.fromAddress,
        subject: payload.subject,
        body: payload.body,
        templateKey: payload.templateKey,
        customerId: payload.customerId,
        metadata: payload.metadata,
      });

      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: result.status,
          externalId: result.externalId ?? null,
          errorMessage: result.errorMessage ?? null,
          sentAt: result.status === MessageStatus.SENT ||
                  result.status === MessageStatus.DELIVERED
            ? new Date()
            : null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falha ao enviar mensagem ${log.id}: ${message}`,
      );
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: message,
        },
      });
    }

    return log.id;
  }
}
