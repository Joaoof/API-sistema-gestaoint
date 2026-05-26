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
 *
 * Safeguards (importantes — vide incidente 2026-05-16):
 *  1. SÓ processa event=messages.upsert. Ignora 25+ outros eventos do
 *     Evolution (SEND_MESSAGE causa loop, MESSAGES_UPDATE/PRESENCE_UPDATE
 *     geram volume sem valor).
 *  2. Ignora grupos (@g.us), broadcasts/status (@broadcast, status@broadcast).
 *  3. Rate limit: 1 resposta a cada 60s por peerNumber dentro da mesma
 *     instância (evita flood de bot competidor / repeat sends).
 *  4. Kill switch: env CHATBOT_DISABLED=true desabilita TUDO sem deploy.
 */
@Controller('api/chatbot/evolution')
export class ChatbotEvolutionWebhookController {
  private readonly logger = new Logger(ChatbotEvolutionWebhookController.name);

  // Memória in-process pra rate limit. Multi-instance precisa migrar pra Redis.
  // Key: `${companyId}:${peerNumber}` → timestamp ms da última msg processada.
  private readonly lastReplyAt = new Map<string, number>();
  private static readonly RATE_LIMIT_WINDOW_MS = 60_000;

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
    // KILL SWITCH global — desabilita tudo sem precisar redeploy.
    if (process.env.CHATBOT_DISABLED === 'true') {
      return { ok: true, skipped: 'chatbot-disabled' };
    }

    const instance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
      select: { companyId: true, webhookToken: true },
    });
    if (!instance) {
      this.logger.warn(`Webhook recebido para instanceName desconhecido: ${instanceName}`);
      return { ok: false, reason: 'instance-not-found' };
    }
    if (instance.webhookToken && instance.webhookToken !== token) {
      throw new UnauthorizedException('webhook token inválido');
    }

    const event = (payload?.event ?? payload?.type ?? '').toString().toLowerCase();

    // SAFEGUARD 1: só processa messages.upsert. Tudo o mais é ruído.
    // Evolution chama isso com vários separadores: "messages.upsert",
    // "messages_upsert", "MESSAGES_UPSERT". Regex tolerante.
    if (event && !/^messages?[._-]?upsert$/i.test(event)) {
      return { ok: true, skipped: `event:${event}` };
    }

    const messages =
      payload?.data?.messages ??
      payload?.messages ??
      (payload?.data
        ? [payload.data]
        : payload?.message
          ? [payload.message]
          : []);

    if (!Array.isArray(messages) || messages.length === 0) {
      return { ok: true, skipped: 'no-messages' };
    }

    for (const msg of messages) {
      await this.processMessage(instance.companyId, msg).catch((e) => {
        this.logger.warn(`processMessage falhou: ${(e as Error).message}`);
      });
    }

    return { ok: true, processed: messages.length };
  }

  private async processMessage(companyId: string, msg: any) {
    // Filtra mensagens nossas (fromMe) — sempre. Sem isso vira loop.
    if (msg?.key?.fromMe) return;

    const remoteJid: string | undefined = msg?.key?.remoteJid;
    if (!remoteJid) return;

    // SAFEGUARD 2: ignora grupos, broadcast/status. Atendimento individual só.
    //   - Grupos:    "120363xxx@g.us"
    //   - Broadcast: "status@broadcast" ou "*@broadcast"
    //   - Newsletter: "*@newsletter"
    if (
      remoteJid.endsWith('@g.us') ||
      remoteJid.endsWith('@broadcast') ||
      remoteJid.endsWith('@newsletter')
    ) {
      return;
    }

    const peerNumber = remoteJid.replace(/@.+$/, '');
    if (!peerNumber) return;

    const text: string | undefined =
      msg?.message?.conversation ??
      msg?.message?.extendedTextMessage?.text ??
      msg?.body ??
      undefined;

    if (!text || !text.trim()) return;

    // SAFEGUARD 3: rate limit por peerNumber (60s).
    const rateKey = `${companyId}:${peerNumber}`;
    const last = this.lastReplyAt.get(rateKey) ?? 0;
    const now = Date.now();
    if (now - last < ChatbotEvolutionWebhookController.RATE_LIMIT_WINDOW_MS) {
      this.logger.debug(`Rate-limit hit (${rateKey}) — ignorando msg.`);
      return;
    }
    this.lastReplyAt.set(rateKey, now);

    await this.engine.handleIncoming({
      companyId,
      peerNumber,
      text,
      pushName: msg?.pushName,
    });
  }
}
