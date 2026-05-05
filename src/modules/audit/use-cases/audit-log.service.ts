import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface AuditEvent {
  companyId: string;
  userId?: string | null;
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    event: AuditEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<unknown> {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        companyId: event.companyId,
        userId: event.userId ?? null,
        entity: event.entity,
        entityId: event.entityId,
        action: event.action,
        beforeJson:
          event.before === undefined
            ? Prisma.DbNull
            : (event.before as Prisma.InputJsonValue),
        afterJson:
          event.after === undefined
            ? Prisma.DbNull
            : (event.after as Prisma.InputJsonValue),
        reason: event.reason ?? null,
      },
    });
  }
}
