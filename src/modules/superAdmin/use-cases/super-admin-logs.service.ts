import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ListLogsInput, LogEntryDto, LogSeverity } from '../dto/super-admin.dto';

/**
 * Mapeia AuditAction → severidade. Pode ser refinado conforme negócio.
 */
function severityOf(action: string): LogSeverity {
  const a = action.toUpperCase();
  if (a.includes('DELETE') || a.includes('CANCEL') || a.includes('SUSPEND')) return LogSeverity.CRITICAL;
  if (a.includes('FAIL') || a.includes('ERROR')) return LogSeverity.ERROR;
  if (a.includes('WARN') || a.includes('RETRY')) return LogSeverity.WARN;
  return LogSeverity.INFO;
}

@Injectable()
export class SuperAdminLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input?: ListLogsInput): Promise<LogEntryDto[]> {
    const where: any = {};
    if (input?.companyId) where.companyId = input.companyId;
    if (input?.from || input?.to) {
      where.createdAt = {};
      if (input.from) where.createdAt.gte = input.from;
      if (input.to) where.createdAt.lte = input.to;
    }
    if (input?.search) {
      where.OR = [
        { entity: { contains: input.search, mode: 'insensitive' } },
        { entityId: { contains: input.search } },
        { reason: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: input?.take ?? 200,
      skip: input?.skip ?? 0,
      include: {
        user: { select: { name: true } },
        company: { select: { name: true } },
      },
    });

    const mapped: LogEntryDto[] = logs.map((l) => ({
      id: l.id,
      severity: severityOf(l.action),
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      companyId: l.companyId,
      companyName: l.company?.name ?? null,
      userId: l.userId,
      userName: l.user?.name ?? null,
      reason: l.reason,
      createdAt: l.createdAt,
    }));

    // Filtra severidade após o map (já que não está no banco)
    return input?.severity ? mapped.filter((m) => m.severity === input.severity) : mapped;
  }
}
