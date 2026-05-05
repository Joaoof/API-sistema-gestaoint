import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export type ChatbotTrigger =
  | 'keyword'
  | 'regex'
  | 'first_message'
  | 'out_of_hours';

interface CreateRuleInput {
  name: string;
  trigger: ChatbotTrigger;
  pattern?: string | null;
  responseBody: string;
  priority?: number;
  enabled?: boolean;
  applyTags?: string[];
  businessHoursOnly?: boolean;
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  cooldownMinutes?: number;
}

@Injectable()
export class WhatsappChatbotService {
  private readonly logger = new Logger(WhatsappChatbotService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.whatsappChatbotRule.findMany({
      where: { companyId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(companyId: string, input: CreateRuleInput) {
    if (!input.name.trim()) throw new BadRequestException('Nome obrigatório.');
    if (!input.responseBody.trim())
      throw new BadRequestException('Resposta obrigatória.');
    if (
      (input.trigger === 'keyword' || input.trigger === 'regex') &&
      !input.pattern?.trim()
    ) {
      throw new BadRequestException(
        'Pattern obrigatório para triggers keyword/regex.',
      );
    }
    if (input.trigger === 'regex') {
      try {
        new RegExp(input.pattern!);
      } catch {
        throw new BadRequestException('Regex inválida.');
      }
    }
    return this.prisma.whatsappChatbotRule.create({
      data: {
        companyId,
        name: input.name.trim(),
        trigger: input.trigger,
        pattern: input.pattern?.trim() || null,
        responseBody: input.responseBody,
        priority: input.priority ?? 100,
        enabled: input.enabled ?? true,
        applyTags: input.applyTags ?? [],
        businessHoursOnly: input.businessHoursOnly ?? false,
        businessHoursStart: input.businessHoursStart ?? null,
        businessHoursEnd: input.businessHoursEnd ?? null,
        cooldownMinutes: input.cooldownMinutes ?? 60,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    patch: Partial<CreateRuleInput>,
  ) {
    const r = await this.prisma.whatsappChatbotRule.findUnique({
      where: { id },
    });
    if (!r || r.companyId !== companyId) {
      throw new BadRequestException('Regra não encontrada.');
    }
    return this.prisma.whatsappChatbotRule.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.trigger !== undefined ? { trigger: patch.trigger } : {}),
        ...(patch.pattern !== undefined ? { pattern: patch.pattern } : {}),
        ...(patch.responseBody !== undefined
          ? { responseBody: patch.responseBody }
          : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.applyTags !== undefined ? { applyTags: patch.applyTags } : {}),
        ...(patch.businessHoursOnly !== undefined
          ? { businessHoursOnly: patch.businessHoursOnly }
          : {}),
        ...(patch.businessHoursStart !== undefined
          ? { businessHoursStart: patch.businessHoursStart }
          : {}),
        ...(patch.businessHoursEnd !== undefined
          ? { businessHoursEnd: patch.businessHoursEnd }
          : {}),
        ...(patch.cooldownMinutes !== undefined
          ? { cooldownMinutes: patch.cooldownMinutes }
          : {}),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const r = await this.prisma.whatsappChatbotRule.findUnique({
      where: { id },
    });
    if (!r || r.companyId !== companyId)
      throw new BadRequestException('Regra não encontrada.');
    await this.prisma.whatsappChatbotRule.delete({ where: { id } });
    return true;
  }

  /**
   * Avalia regras na ordem de prioridade. Retorna a primeira que matcha (com
   * cooldown ativo respeitado). `isFirst` indica se é a primeira mensagem do
   * peer na conversa atual.
   */
  async findMatchingRule(input: {
    companyId: string;
    peerNumber: string;
    text: string;
    isFirstMessage: boolean;
    now?: Date;
  }): Promise<{
    rule: { id: string; responseBody: string; applyTags: string[] };
    matchedText: string;
  } | null> {
    const now = input.now ?? new Date();
    const rules = await this.prisma.whatsappChatbotRule.findMany({
      where: { companyId: input.companyId, enabled: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const isOutOfHours = (
      start: string | null,
      end: string | null,
    ): boolean => {
      if (!start || !end) return false;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const minutes = now.getHours() * 60 + now.getMinutes();
      const startM = sh * 60 + sm;
      const endM = eh * 60 + em;
      if (startM <= endM) return minutes < startM || minutes >= endM;
      return minutes < startM && minutes >= endM;
    };

    for (const r of rules) {
      // business hours filter (genérico para todas regras com flag)
      if (
        r.businessHoursOnly &&
        isOutOfHours(r.businessHoursStart, r.businessHoursEnd)
      ) {
        continue;
      }

      let matches = false;
      if (r.trigger === 'first_message') {
        matches = input.isFirstMessage;
      } else if (r.trigger === 'out_of_hours') {
        matches = isOutOfHours(r.businessHoursStart, r.businessHoursEnd);
      } else if (r.trigger === 'keyword' && r.pattern) {
        matches = input.text.toLowerCase().includes(r.pattern.toLowerCase());
      } else if (r.trigger === 'regex' && r.pattern) {
        try {
          matches = new RegExp(r.pattern, 'i').test(input.text);
        } catch {
          matches = false;
        }
      }
      if (!matches) continue;

      // cooldown: não dispara a mesma regra pro mesmo peer dentro de N min
      const cutoff = new Date(now.getTime() - r.cooldownMinutes * 60_000);
      const recent = await this.prisma.whatsappChatbotLog.findFirst({
        where: {
          companyId: input.companyId,
          peerNumber: input.peerNumber,
          ruleId: r.id,
          firedAt: { gte: cutoff },
        },
      });
      if (recent) continue;

      return {
        rule: {
          id: r.id,
          responseBody: r.responseBody,
          applyTags: r.applyTags,
        },
        matchedText: input.text,
      };
    }
    return null;
  }

  async logFire(
    companyId: string,
    ruleId: string,
    peerNumber: string,
    triggerText: string | null,
  ): Promise<void> {
    await this.prisma.whatsappChatbotLog.create({
      data: { companyId, ruleId, peerNumber, triggerText },
    });
  }
}
