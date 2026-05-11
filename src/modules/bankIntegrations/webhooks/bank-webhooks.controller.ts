import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { NormalizedEvent, WebhookProcessor } from '../use-cases/webhook-processor.service';

/**
 * Webhooks bancários — endpoints públicos (com verificação HMAC quando o
 * banco oferece). Cada banco tem seu shape de payload; convertemos pra
 * shape normalizado no WebhookProcessor.
 *
 * ⚠️ Configuração no painel do banco:
 *   - Itaú PIX:     URL = https://SEU_HOST/api/webhooks/pix/itau
 *   - Itaú Boleto:  URL = https://SEU_HOST/api/webhooks/boleto/itau
 *   - BB PIX:       URL = https://SEU_HOST/api/webhooks/pix/bb
 *   - BB Boleto:    URL = https://SEU_HOST/api/webhooks/boleto/bb
 *
 * Cada banco vai validar via:
 *   - mTLS (Itaú) — cliente autentica com cert; assinatura HMAC opcional
 *   - HMAC-SHA256 header (BB) — env: BB_WEBHOOK_SECRET
 */
@Controller('api/webhooks')
export class BankWebhooksController {
  private readonly logger = new Logger(BankWebhooksController.name);

  constructor(private readonly processor: WebhookProcessor) {}

  // ============ Itaú PIX ============

  @Post('pix/itau')
  @HttpCode(HttpStatus.OK)
  async itauPix(
    @Body() payload: any,
    @Headers('x-signature') signature?: string,
  ) {
    this.verifyHmac(payload, signature, process.env.ITAU_WEBHOOK_SECRET);

    /**
     * Payload Itaú PIX recebido (resumo):
     *   {
     *     "pix": [
     *       { "endToEndId": "...", "txid": "...", "valor": "150.00",
     *         "horario": "2026-05-11T10:30:00Z",
     *         "pagador": { "nome": "...", "cpf": "..." } }
     *     ]
     *   }
     */
    const ids: string[] = [];
    for (const pix of payload?.pix ?? []) {
      const id = await this.processor.receive({
        provider: 'ITAU_PIX',
        event: 'pix.received',
        signature,
        payload: pix,
        normalize: (): NormalizedEvent => ({
          kind: 'PIX_IN',
          provider: 'ITAU',
          txid: pix.txid ?? pix.endToEndId,
          amount: parseFloat(pix.valor),
          payerName: pix.pagador?.nome ?? null,
          payerDocument: pix.pagador?.cpf ?? pix.pagador?.cnpj ?? null,
          paidAt: new Date(pix.horario),
          refExternalId: pix.txid ?? null,
        }),
      });
      ids.push(id);
    }
    return { received: ids.length, ids };
  }

  // ============ Itaú Boleto ============

  @Post('boleto/itau')
  @HttpCode(HttpStatus.OK)
  async itauBoleto(
    @Body() payload: any,
    @Headers('x-signature') signature?: string,
  ) {
    this.verifyHmac(payload, signature, process.env.ITAU_WEBHOOK_SECRET);

    /**
     * Itaú Cobrança v2 — exemplo de evento "PAID":
     *   {
     *     "evento": "PAGAMENTO_RECEBIDO",
     *     "nosso_numero": "12345678901",
     *     "valor_pago": "350.00",
     *     "data_pagamento": "2026-05-11"
     *   }
     */
    if (payload?.evento !== 'PAGAMENTO_RECEBIDO') {
      return { received: 0, reason: 'evento ignorado' };
    }
    const id = await this.processor.receive({
      provider: 'ITAU_BOLETO',
      event: 'boleto.paid',
      signature,
      payload,
      normalize: (): NormalizedEvent => ({
        kind: 'BOLETO_PAID',
        provider: 'ITAU',
        nossoNumero: String(payload.nosso_numero),
        amount: parseFloat(payload.valor_pago),
        paidAt: new Date(payload.data_pagamento),
      }),
    });
    return { received: 1, id };
  }

  // ============ Banco do Brasil PIX ============

  @Post('pix/bb')
  @HttpCode(HttpStatus.OK)
  async bbPix(
    @Body() payload: any,
    @Headers('x-signature-bb') signature?: string,
  ) {
    this.verifyHmac(payload, signature, process.env.BB_WEBHOOK_SECRET);

    /**
     * BB API PIX — exemplo:
     *   {
     *     "pix": [
     *       { "endToEndId": "...", "txid": "...", "valor": "200.00",
     *         "horario": "2026-05-11T10:30:00Z",
     *         "infoPagador": "..." }
     *     ]
     *   }
     */
    const ids: string[] = [];
    for (const pix of payload?.pix ?? []) {
      const id = await this.processor.receive({
        provider: 'BB_PIX',
        event: 'pix.received',
        signature,
        payload: pix,
        normalize: (): NormalizedEvent => ({
          kind: 'PIX_IN',
          provider: 'BB',
          txid: pix.txid ?? pix.endToEndId,
          amount: parseFloat(pix.valor),
          payerName: pix.infoPagador ?? null,
          paidAt: new Date(pix.horario),
          refExternalId: pix.txid ?? null,
        }),
      });
      ids.push(id);
    }
    return { received: ids.length, ids };
  }

  // ============ Banco do Brasil Boleto ============

  @Post('boleto/bb')
  @HttpCode(HttpStatus.OK)
  async bbBoleto(
    @Body() payload: any,
    @Headers('x-signature-bb') signature?: string,
  ) {
    this.verifyHmac(payload, signature, process.env.BB_WEBHOOK_SECRET);

    /**
     * BB Cobrança — evento de baixa de boleto:
     *   {
     *     "evento": "REGISTRO_LIQUIDACAO",
     *     "numeroTitulo": "...",
     *     "valorPago": "350.00",
     *     "dataLiquidacao": "11.05.2026"
     *   }
     */
    if (payload?.evento !== 'REGISTRO_LIQUIDACAO') {
      return { received: 0, reason: 'evento ignorado' };
    }

    const dt = String(payload.dataLiquidacao || '').split('.');
    const paidAt = dt.length === 3 ? new Date(+dt[2], +dt[1] - 1, +dt[0]) : new Date();

    const id = await this.processor.receive({
      provider: 'BB_BOLETO',
      event: 'boleto.paid',
      signature,
      payload,
      normalize: (): NormalizedEvent => ({
        kind: 'BOLETO_PAID',
        provider: 'BB',
        nossoNumero: String(payload.numeroTitulo),
        amount: parseFloat(payload.valorPago),
        paidAt,
      }),
    });
    return { received: 1, id };
  }

  // ============ Helpers ============

  /**
   * Verifica assinatura HMAC-SHA256 do header.
   * Se o secret não estiver configurado, deixa passar (dev/sandbox).
   * Em produção, exija o secret no env.
   */
  private verifyHmac(payload: unknown, signature: string | undefined, secret?: string) {
    if (!secret) {
      this.logger.warn('Webhook recebido sem secret configurado — pulando verificação.');
      return;
    }
    if (!signature) {
      throw new UnauthorizedException('Header de assinatura ausente.');
    }
    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Assinatura inválida.');
    }
  }
}
