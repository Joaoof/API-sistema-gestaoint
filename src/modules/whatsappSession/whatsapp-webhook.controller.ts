import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappSessionService } from './use-cases/whatsapp-session.service';

@Controller('api/whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly service: WhatsappSessionService,
    private readonly config: ConfigService,
  ) {}

  @Post(':instanceName')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('instanceName') instanceName: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: boolean }> {
    if (!instanceName) {
      throw new BadRequestException('instanceName ausente.');
    }

    const event =
      typeof body?.event === 'string'
        ? body.event
        : ((body?.eventType as string | undefined) ?? '');

    if (!event) {
      this.logger.warn('Webhook sem campo "event"');
      return { ok: true };
    }

    try {
      await this.service.handleWebhook(instanceName, event, body);
    } catch (err) {
      this.logger.error(
        `Erro processando webhook ${event}: ${err instanceof Error ? err.message : err}`,
      );
    }
    return { ok: true };
  }
}
