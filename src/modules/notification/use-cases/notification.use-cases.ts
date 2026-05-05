import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateNotificationInput,
  NotificationFilterInput,
} from '../dto/notification.input';
import {
  NotificationEntity,
  NotificationPageEntity,
} from '../entities/notification.entity';

type RawNotification = Prisma.NotificationGetPayload<{}>;

function serializeJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function toEntity(raw: RawNotification): NotificationEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    userId: raw.userId,
    type: raw.type,
    severity: raw.severity,
    title: raw.title,
    message: raw.message,
    href: raw.href,
    entity: raw.entity,
    entityId: raw.entityId,
    metadataJson: serializeJson(raw.metadataJson),
    readAt: raw.readAt,
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
  };
}

@Injectable()
export class NotificationUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    companyId: string,
    userId: string,
    filter: NotificationFilterInput = {},
  ): Promise<NotificationPageEntity> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    // Visíveis ao usuário: dirigidas a ele OU sem destinatário (broadcast)
    const visibleToUser: Prisma.NotificationWhereInput = {
      OR: [{ userId }, { userId: null }],
    };

    const where: Prisma.NotificationWhereInput = {
      companyId,
      AND: [
        visibleToUser,
        ...(filter.type ? [{ type: filter.type }] : []),
        ...(filter.severity ? [{ severity: filter.severity }] : []),
        ...(filter.unreadOnly ? [{ readAt: null }] : []),
        ...(filter.from || filter.to
          ? [
              {
                createdAt: {
                  ...(filter.from ? { gte: filter.from } : {}),
                  ...(filter.to ? { lte: filter.to } : {}),
                },
              },
            ]
          : []),
        ...(filter.search
          ? [
              {
                OR: [
                  { title: { contains: filter.search, mode: 'insensitive' as const } },
                  { message: { contains: filter.search, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    };

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { companyId, OR: [{ userId }, { userId: null }], readAt: null },
      }),
    ]);

    return {
      items: items.map(toEntity),
      total,
      page,
      pageSize,
      unreadCount,
    };
  }

  async unreadCount(companyId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { companyId, OR: [{ userId }, { userId: null }], readAt: null },
    });
  }

  async markAsRead(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<NotificationEntity> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (
      !existing ||
      existing.companyId !== companyId ||
      (existing.userId !== null && existing.userId !== userId)
    ) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    if (existing.readAt) return toEntity(existing);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return toEntity(updated);
  }

  async markAllAsRead(companyId: string, userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        companyId,
        OR: [{ userId }, { userId: null }],
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async dismiss(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (
      !existing ||
      existing.companyId !== companyId ||
      (existing.userId !== null && existing.userId !== userId)
    ) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    await this.prisma.notification.delete({ where: { id } });
    return true;
  }

  async create(
    companyId: string,
    input: CreateNotificationInput,
  ): Promise<NotificationEntity> {
    const created = await this.prisma.notification.create({
      data: {
        companyId,
        userId: input.userId ?? null,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        href: input.href ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
      },
    });
    return toEntity(created);
  }
}
