import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageStatus, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationTemplateUseCases } from '../../notificationTemplate/use-cases/notification-template.use-cases';
import { BuildWhatsappLinkInput } from '../dto/whatsapp.input';
import { WhatsappLinkEntity } from '../entities/whatsapp-link.entity';

const WA_BASE = 'https://wa.me';

function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D+/g, '');
  if (digits.length < 10) {
    throw new BadRequestException(
      'Telefone inválido — informe com DDI/DDD (ex.: 5571999998888).',
    );
  }
  return digits;
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: NotificationTemplateUseCases,
  ) {}

  async buildLink(
    companyId: string,
    input: BuildWhatsappLinkInput,
  ): Promise<WhatsappLinkEntity> {
    const phone = sanitizePhone(input.toPhone);

    let body = input.body?.trim() ?? '';
    if (!body && input.templateKey) {
      const template = await this.templates.findByKey(
        companyId,
        input.templateKey,
        NotificationChannel.WHATSAPP,
      );
      if (!template) {
        throw new NotFoundException(
          `Template WhatsApp "${input.templateKey}" não encontrado.`,
        );
      }
      let vars: Record<string, unknown> = {};
      if (input.varsJson) {
        try {
          vars = JSON.parse(input.varsJson) as Record<string, unknown>;
        } catch {
          throw new BadRequestException('varsJson inválido.');
        }
      }
      const rendered = this.templates.render(template, vars);
      body = rendered.body;
    }

    if (!body) {
      throw new BadRequestException(
        'Informe body ou templateKey para gerar a mensagem.',
      );
    }

    const url = `${WA_BASE}/${phone}?text=${encodeURIComponent(body)}`;

    let messageLogId: string | null = null;
    if (input.log !== false) {
      const log = await this.prisma.messageLog.create({
        data: {
          companyId,
          channel: NotificationChannel.WHATSAPP,
          direction: 'OUTBOUND',
          toAddress: phone,
          body,
          status: MessageStatus.PENDING,
          customerId: input.customerId ?? null,
          templateKey: input.templateKey ?? null,
          metadataJson: { kind: 'wa.me-link' },
        },
      });
      messageLogId = log.id;
    }

    return { url, body, toAddress: phone, messageLogId };
  }

  async markLinkOpened(messageLogId: string): Promise<boolean> {
    const log = await this.prisma.messageLog.findUnique({
      where: { id: messageLogId },
    });
    if (!log) return false;
    if (log.status === MessageStatus.PENDING) {
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });
    }
    return true;
  }
}
