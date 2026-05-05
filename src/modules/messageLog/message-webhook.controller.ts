import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { MessageLogUseCases } from './use-cases/message-log.use-cases';

interface WebhookBody {
  externalId?: unknown;
  status?: unknown;
  errorMessage?: unknown;
}

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: MessageStatus.SENT,
  delivered: MessageStatus.DELIVERED,
  read: MessageStatus.READ,
  failed: MessageStatus.FAILED,
  pending: MessageStatus.PENDING,
};

@Controller('api/messages/webhook')
export class MessageWebhookController {
  constructor(private readonly useCases: MessageLogUseCases) {}

  @Post(':channel')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('channel') channel: string,
    @Body() body: WebhookBody,
  ): Promise<{ ok: boolean; updated: boolean }> {
    if (!['whatsapp', 'email', 'sms', 'push'].includes(channel)) {
      throw new BadRequestException('Canal inválido.');
    }

    const externalId = typeof body.externalId === 'string' ? body.externalId : null;
    const statusRaw = typeof body.status === 'string' ? body.status.toLowerCase() : null;
    if (!externalId || !statusRaw) {
      throw new BadRequestException('externalId e status são obrigatórios.');
    }

    const status = STATUS_MAP[statusRaw];
    if (!status) {
      throw new BadRequestException(`Status desconhecido: ${statusRaw}`);
    }

    const errorMessage =
      typeof body.errorMessage === 'string' ? body.errorMessage : undefined;

    const updated = await this.useCases.updateStatusByExternalId(
      externalId,
      status,
      errorMessage,
    );
    return { ok: true, updated };
  }
}
