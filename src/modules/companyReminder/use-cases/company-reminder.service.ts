import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../../../../prisma/prisma.service';

export const COMPANY_REMINDER_DUE = 'COMPANY_REMINDER_DUE';

interface CreateInput {
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  link?: string | null;
  dueAt: Date;
  createdBy?: string | null;
}

@Injectable()
export class CompanyReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompanyReminderService.name);
  private readonly pubsub = new PubSub();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  asyncIterator() {
    return this.pubsub.asyncIterableIterator(COMPANY_REMINDER_DUE);
  }

  onModuleInit() {
    // Polling a cada 30s — checa lembretes vencidos não notificados
    this.timer = setInterval(() => {
      this.fireDue().catch((err) =>
        this.logger.warn(
          `fireDue: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async create(companyId: string, input: CreateInput) {
    if (!input.title.trim()) {
      throw new BadRequestException('Título obrigatório.');
    }
    return this.prisma.companyReminder.create({
      data: {
        companyId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        priority: input.priority ?? 'normal',
        link: input.link?.trim() || null,
        dueAt: input.dueAt,
        createdBy: input.createdBy ?? null,
      },
    });
  }

  list(
    companyId: string,
    opts: { pending?: boolean; category?: string; priority?: string } = {},
  ) {
    return this.prisma.companyReminder.findMany({
      where: {
        companyId,
        ...(opts.pending ? { doneAt: null } : {}),
        ...(opts.category ? { category: opts.category } : {}),
        ...(opts.priority ? { priority: opts.priority } : {}),
      },
      orderBy: [{ doneAt: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async toggleDone(companyId: string, id: string, done: boolean) {
    const r = await this.prisma.companyReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) {
      throw new BadRequestException('Lembrete não encontrado.');
    }
    return this.prisma.companyReminder.update({
      where: { id },
      data: { doneAt: done ? new Date() : null },
    });
  }

  async snooze(companyId: string, id: string, minutes: number) {
    const r = await this.prisma.companyReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) {
      throw new BadRequestException('Lembrete não encontrado.');
    }
    const newDue = new Date(Date.now() + minutes * 60_000);
    return this.prisma.companyReminder.update({
      where: { id },
      data: { dueAt: newDue, notifiedAt: null },
    });
  }

  async remove(companyId: string, id: string) {
    const r = await this.prisma.companyReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) {
      throw new BadRequestException('Lembrete não encontrado.');
    }
    await this.prisma.companyReminder.delete({ where: { id } });
    return true;
  }

  /**
   * Encontra lembretes vencidos sem `notifiedAt` e dispara via PubSub.
   * Marca `notifiedAt` pra não disparar de novo.
   */
  private async fireDue() {
    const now = new Date();
    const due = await this.prisma.companyReminder.findMany({
      where: {
        doneAt: null,
        notifiedAt: null,
        dueAt: { lte: now },
      },
      take: 50,
    });
    if (due.length === 0) return;
    for (const r of due) {
      await this.prisma.companyReminder
        .update({
          where: { id: r.id },
          data: { notifiedAt: now },
        })
        .catch(() => undefined);
      void this.pubsub.publish(COMPANY_REMINDER_DUE, {
        companyReminderDue: {
          id: r.id,
          companyId: r.companyId,
          title: r.title,
          description: r.description,
          category: r.category,
          priority: r.priority,
          link: r.link,
          dueAt: r.dueAt,
          doneAt: null,
          notifiedAt: now,
          createdBy: r.createdBy,
          createdAt: r.createdAt,
        },
      });
    }
  }
}
