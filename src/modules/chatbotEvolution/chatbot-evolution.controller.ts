import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EvolutionChatbotEngineService } from './use-cases/evolution-chatbot-engine.service';

/**
 * Endpoint público (sem JWT) que Evolution API chama com eventos.
 * Multi-tenant: resolve `companyId` a partir do `instanceName` na URL.
 *
 * URL configurada no Evolution server:
 *   POST {PUBLIC_URL}/api/chatbot/evolution/:instanceName/webhook
 */
@Controller('api/chatbot/evolution')
export class ChatbotEvolutionWebhookController {
  private readonly logger = new Logger(ChatbotEvolutionWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EvolutionChatbotEngineService,
  ) {}

  @Post(':instanceName/webhook')
  @HttpCode(200)
  async handle(
    @Param('instanceName') instanceName: string,
    @Headers('x-webhook-token') token: string | undefined,
    @Body() payload: any,
  ) {
    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
      select: { companyId: true, webhookToken: true },
    });
    if (!instance) {
      this.logger.warn(`Webhook recebido para instanceName desconhecido: ${instanceName}`);
      return { ok: false, reason: 'instance-not-found' };
    }
    // Se a empresa configurou um token, exige header
    if (instance.webhookToken && instance.webhookToken !== token) {
      throw new UnauthorizedException('webhook token inválido');
    }

    const event = (payload?.event ?? payload?.type ?? '').toString();

    // Evolution v2 envia messages.upsert dentro de `data` ou direto
    const messages =
      payload?.data?.messages ??
      payload?.messages ??
      (payload?.message ? [payload.message] : []);

    if (/messages?\.?upsert/i.test(event) || messages.length > 0) {
      for (const msg of messages) {
        await this.processMessage(instance.companyId, msg).catch((e) => {
          this.logger.warn(`processMessage falhou: ${(e as Error).message}`);
        });
      }
    }

    return { ok: true };
  }

  private async processMessage(companyId: string, msg: any) {
    // Filtra mensagens nossas (fromMe) e tipos não-suportados
    const fromMe = !!msg?.key?.fromMe;
    if (fromMe) return;

    const remoteJid: string | undefined = msg?.key?.remoteJid;
    if (!remoteJid) return;

    const peerNumber = remoteJid.replace(/@.+$/, '');
    const pushName: string | undefined = msg?.pushName;
    const text: string | undefined =
      msg?.message?.conversation ??
      msg?.message?.extendedTextMessage?.text ??
      msg?.body ??
      undefined;

    if (!text || !text.trim()) return;

    await this.engine.handleIncoming({
      companyId,
      peerNumber,
      text,
      pushName,
    });
  }
}
