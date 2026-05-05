import { Injectable } from '@nestjs/common';
import { MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MessageLogFilterInput } from '../dto/message-log.input';
import {
  MessageLogEntity,
  MessageLogPageEntity,
} from '../entities/message-log.entity';

type RawLog = Prisma.MessageLogGetPayload<{
  include: { customer: { select: { id: true; name: true } } };
}>;

function toEntity(raw: RawLog): MessageLogEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    channel: raw.channel,
    direction: raw.direction,
    toAddress: raw.toAddress,
    fromAddress: raw.fromAddress,
    subject: raw.subject,
    body: raw.body,
    status: raw.status,
    externalId: raw.externalId,
    errorMessage: raw.errorMessage,
    customerId: raw.customerId,
    customerName: raw.customer?.name ?? null,
    templateKey: raw.templateKey,
    createdAt: raw.createdAt,
    sentAt: raw.sentAt,
    deliveredAt: raw.deliveredAt,
    readAt: raw.readAt,
  };
}

@Injectable()
export class MessageLogUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    companyId: string,
    filter: MessageLogFilterInput = {},
  ): Promise<MessageLogPageEntity> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    const where: Prisma.MessageLogWhereInput = {
      companyId,
      ...(filter.channel ? { channel: filter.channel } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.direction ? { direction: filter.direction } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { toAddress: { contains: filter.search, mode: 'insensitive' } },
              { subject: { contains: filter.search, mode: 'insensitive' } },
              { body: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.messageLog.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.messageLog.count({ where }),
    ]);

    return {
      items: items.map(toEntity),
      total,
      page,
      pageSize,
    };
  }

  async findByExternalId(externalId: string) {
    return this.prisma.messageLog.findFirst({ where: { externalId } });
  }

  async updateStatusByExternalId(
    externalId: string,
    status: MessageStatus,
    errorMessage?: string,
  ): Promise<boolean> {
    const log = await this.prisma.messageLog.findFirst({
      where: { externalId },
    });
    if (!log) return false;

    const data: Prisma.MessageLogUpdateInput = { status };
    if (status === MessageStatus.DELIVERED && !log.deliveredAt) {
      data.deliveredAt = new Date();
    }
    if (status === MessageStatus.READ && !log.readAt) {
      data.readAt = new Date();
    }
    if (status === MessageStatus.FAILED) {
      data.errorMessage = errorMessage ?? 'Falha sem detalhes do provedor.';
    }

    await this.prisma.messageLog.update({ where: { id: log.id }, data });
    return true;
  }
}
