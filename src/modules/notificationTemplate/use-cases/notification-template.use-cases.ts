import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import {
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
} from '../dto/notification-template.input';
import { NotificationTemplateEntity } from '../entities/notification-template.entity';

type RawTemplate = Prisma.NotificationTemplateGetPayload<{}>;

function toEntity(raw: RawTemplate): NotificationTemplateEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    key: raw.key,
    channel: raw.channel,
    name: raw.name,
    subject: raw.subject,
    body: raw.body,
    active: raw.active,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class NotificationTemplateUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    companyId: string,
    channel?: NotificationChannel,
    activeOnly?: boolean,
  ): Promise<NotificationTemplateEntity[]> {
    const rows = await this.prisma.notificationTemplate.findMany({
      where: {
        companyId,
        ...(channel ? { channel } : {}),
        ...(activeOnly ? { active: true } : {}),
      },
      orderBy: [{ name: 'asc' }],
    });
    return rows.map(toEntity);
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<NotificationTemplateEntity> {
    const tpl = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!tpl || tpl.companyId !== companyId) {
      throw new NotFoundException('Template não encontrado.');
    }
    return toEntity(tpl);
  }

  async findByKey(
    companyId: string,
    key: string,
    channel: NotificationChannel,
  ): Promise<NotificationTemplateEntity | null> {
    const tpl = await this.prisma.notificationTemplate.findUnique({
      where: {
        companyId_key_channel: { companyId, key, channel },
      },
    });
    return tpl ? toEntity(tpl) : null;
  }

  async create(
    actor: AuditActor,
    input: CreateNotificationTemplateInput,
  ): Promise<NotificationTemplateEntity> {
    try {
      const created = await this.prisma.notificationTemplate.create({
        data: {
          companyId: actor.companyId,
          key: input.key.trim(),
          channel: input.channel,
          name: input.name.trim(),
          subject: input.subject ?? null,
          body: input.body,
          active: input.active,
        },
      });
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'NotificationTemplate',
        entityId: created.id,
        action: AuditAction.CREATE,
        after: created,
      });
      return toEntity(created);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um template com essa chave para esse canal.',
        );
      }
      throw err;
    }
  }

  async update(
    actor: AuditActor,
    id: string,
    input: UpdateNotificationTemplateInput,
  ): Promise<NotificationTemplateEntity> {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!existing || existing.companyId !== actor.companyId) {
      throw new NotFoundException('Template não encontrado.');
    }
    const updated = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(input.key !== undefined ? { key: input.key.trim() } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'NotificationTemplate',
      entityId: id,
      action: AuditAction.UPDATE,
      before: existing,
      after: updated,
    });
    return toEntity(updated);
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!existing || existing.companyId !== actor.companyId) {
      throw new NotFoundException('Template não encontrado.');
    }
    await this.prisma.notificationTemplate.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'NotificationTemplate',
      entityId: id,
      action: AuditAction.DELETE,
      before: existing,
    });
    return true;
  }

  render(template: NotificationTemplateEntity, vars: Record<string, unknown>): {
    subject: string | null;
    body: string;
  } {
    const interpolate = (s: string) =>
      s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (acc, part) =>
              acc && typeof acc === 'object'
                ? (acc as Record<string, unknown>)[part]
                : undefined,
            vars,
          );
        return value === null || value === undefined ? '' : String(value);
      });
    return {
      subject: template.subject ? interpolate(template.subject) : null,
      body: interpolate(template.body),
    };
  }
}
