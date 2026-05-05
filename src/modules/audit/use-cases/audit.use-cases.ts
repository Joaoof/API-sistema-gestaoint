import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogFilterInput } from '../dto/audit-log-filter.input';
import {
  AuditLogEntity,
  AuditLogPageEntity,
} from '../entities/audit-log.entity';

type RawLog = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

function serializeJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function toEntity(raw: RawLog): AuditLogEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    userId: raw.userId,
    userName: raw.user?.name ?? null,
    userEmail: raw.user?.email ?? null,
    entity: raw.entity,
    entityId: raw.entityId,
    action: raw.action,
    beforeJson: serializeJson(raw.beforeJson),
    afterJson: serializeJson(raw.afterJson),
    reason: raw.reason,
    createdAt: raw.createdAt,
  };
}

@Injectable()
export class AuditUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    companyId: string,
    filter: AuditLogFilterInput = {},
  ): Promise<AuditLogPageEntity> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(filter.entity ? { entity: filter.entity } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.userName
        ? {
            user: {
              is: {
                name: { contains: filter.userName, mode: 'insensitive' },
              },
            },
          }
        : {}),
      ...(filter.action ? { action: filter.action } : {}),
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
              { entity: { contains: filter.search, mode: 'insensitive' } },
              { entityId: { contains: filter.search, mode: 'insensitive' } },
              { reason: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(toEntity),
      total,
      page,
      pageSize,
    };
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<AuditLogEntity | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!log || log.companyId !== companyId) return null;
    return toEntity(log);
  }

  async listForEntity(
    companyId: string,
    entity: string,
    entityId: string,
    limit = 100,
  ): Promise<AuditLogEntity[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { companyId, entity, entityId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map(toEntity);
  }

  async exportCsv(
    companyId: string,
    filter: AuditLogFilterInput = {},
  ): Promise<string> {
    const { ...rest } = filter;
    const result = await this.list(companyId, {
      ...rest,
      page: 1,
      pageSize: 10000,
    });
    return buildCsv(result.items);
  }
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(items: AuditLogEntity[]): string {
  const header = [
    'id',
    'createdAt',
    'action',
    'entity',
    'entityId',
    'userId',
    'userName',
    'userEmail',
    'reason',
    'beforeJson',
    'afterJson',
  ];
  const lines: string[] = [header.join(',')];
  for (const log of items) {
    lines.push(
      [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.entity,
        log.entityId,
        log.userId ?? '',
        log.userName ?? '',
        log.userEmail ?? '',
        log.reason ?? '',
        log.beforeJson ?? '',
        log.afterJson ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n');
}
