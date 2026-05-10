import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WhatsappPubSubService, WHATSAPP_REMINDER_DUE } from './whatsapp-pubsub';

interface CreateReminderInput {
  peerNumber: string;
  title: string;
  description?: string | null;
  tag?: string | null;
  dueAt: Date;
  createdBy?: string | null;
}

@Injectable()
export class WhatsappReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappReminderService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: WhatsappPubSubService,
  ) {}

  onModuleInit() {
    // Lembretes internos do WhatsApp agora são disparados pelo n8n.
    // Pra reativar o agendador interno antigo, defina WHATSAPP_INTERNAL_REMINDERS=true.
    if (process.env.WHATSAPP_INTERNAL_REMINDERS !== 'true') return;

    this.timer = setInterval(() => {
      this.fireDueReminders().catch((err) =>
        this.logger.warn(
          `fireDueReminders: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async create(companyId: string, input: CreateReminderInput) {
    if (!input.peerNumber) {
      throw new BadRequestException('peerNumber obrigatório.');
    }
    if (!input.title.trim()) {
      throw new BadRequestException('Título obrigatório.');
    }
    if (input.dueAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('Data do lembrete não pode estar no passado.');
    }
    return this.prisma.whatsappReminder.create({
      data: {
        companyId,
        peerNumber: input.peerNumber,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        tag: input.tag?.trim() || null,
        dueAt: input.dueAt,
        createdBy: input.createdBy ?? null,
      },
    });
  }

  async list(companyId: string, opts?: { peerNumber?: string; tag?: string; pending?: boolean }) {
    return this.prisma.whatsappReminder.findMany({
      where: {
        companyId,
        ...(opts?.peerNumber ? { peerNumber: opts.peerNumber } : {}),
        ...(opts?.tag ? { tag: opts.tag } : {}),
        ...(opts?.pending ? { doneAt: null } : {}),
      },
      orderBy: [{ doneAt: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async markDone(companyId: string, id: string, done: boolean) {
    const r = await this.prisma.whatsappReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) {
      throw new BadRequestException('Lembrete não encontrado.');
    }
    return this.prisma.whatsappReminder.update({
      where: { id },
      data: { doneAt: done ? new Date() : null },
    });
  }

  async remove(companyId: string, id: string) {
    const r = await this.prisma.whatsappReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) {
      throw new BadRequestException('Lembrete não encontrado.');
    }
    await this.prisma.whatsappReminder.delete({ where: { id } });
    return true;
  }

  /**
   * Encontra lembretes vencidos não-disparados (dueAt <= agora E doneAt null)
   * e dispara para o PubSub. Janela de 5min pra cobrir intervalos perdidos
   * caso o servidor reinicie. Marcamos com `doneAt = null` ainda — o que
   * impede re-disparo é o próprio dueAt já ter passado: pra não spammar,
   * usamos uma flag em metadata? Simplificamos com uma janela `dueAt
   * BETWEEN now-30s AND now+30s`. Lembretes com dueAt antigos não disparam.
   */
  private async fireDueReminders() {
    const now = new Date();
    const window = 35_000; // 35s pra garantir cobertura sem spam
    const due = await this.prisma.whatsappReminder.findMany({
      where: {
        doneAt: null,
        dueAt: {
          gte: new Date(now.getTime() - window),
          lte: new Date(now.getTime() + window),
        },
      },
      take: 100,
    });
    for (const r of due) {
      this.pubsub.publish(WHATSAPP_REMINDER_DUE, {
        whatsappReminderDue: {
          id: r.id,
          companyId: r.companyId,
          peerNumber: r.peerNumber,
          title: r.title,
          description: r.description,
          tag: r.tag,
          dueAt: r.dueAt,
        },
      });
    }
  }
}
