import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

/**
 * Normaliza payloads de diferentes bancos/providers em um shape único e
 * resolve o efeito colateral correto: criar CashMovement, marcar Boleto
 * como PAID, registrar PaymentReceipt + atualizar AR.
 *
 * Idempotência: cada provider tem um "external id" único (txid PIX,
 * nossoNumero do boleto). Antes de criar movimento, checamos se já existe
 * referência ao mesmo external id.
 */

export interface NormalizedPixIn {
  kind: 'PIX_IN';
  provider: 'ITAU' | 'BB' | 'PLUGGY';
  txid: string;
  amount: number;
  payerName?: string | null;
  payerDocument?: string | null;
  paidAt: Date;
  /** Caso o PIX tenha sido emitido pelo sistema (dinâmico), pode vir o id do boleto/AR. */
  refExternalId?: string | null;
}

export interface NormalizedBoletoPaid {
  kind: 'BOLETO_PAID';
  provider: 'ITAU' | 'BB';
  nossoNumero: string;
  amount: number;
  paidAt: Date;
}

export type NormalizedEvent = NormalizedPixIn | NormalizedBoletoPaid;

@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste o evento bruto em WebhookLog e processa em seguida.
   * Retorna o log id pra audit.
   */
  async receive(args: {
    provider: string;
    event: string;
    signature?: string;
    payload: unknown;
    normalize: () => NormalizedEvent | null;
  }): Promise<string> {
    const log = await this.prisma.webhookLog.create({
      data: {
        provider: args.provider,
        event: args.event,
        signature: args.signature ?? null,
        payload: args.payload as any,
      },
    });

    try {
      const normalized = args.normalize();
      if (!normalized) {
        await this.prisma.webhookLog.update({
          where: { id: log.id },
          data: {
            processed: true,
            processedAt: new Date(),
            errorMsg: 'Evento não relevante — ignorado.',
          },
        });
        return log.id;
      }

      const result = await this.process(normalized);
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          processed: true,
          processedAt: new Date(),
          refType: result?.refType ?? null,
          refId: result?.refId ?? null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Webhook processing failed [${log.id}]: ${err.message}`);
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          processed: false,
          processedAt: new Date(),
          errorMsg: err.message,
        },
      });
    }

    return log.id;
  }

  private async process(event: NormalizedEvent): Promise<{ refType: string; refId: string } | null> {
    if (event.kind === 'PIX_IN') return this.processPixIn(event);
    if (event.kind === 'BOLETO_PAID') return this.processBoletoPaid(event);
    return null;
  }

  /**
   * PIX recebido — pode vir vinculado a um Boleto PIX (refExternalId) ou avulso.
   * Vinculado: marca o Boleto como PAID (que cria PaymentReceipt + atualiza AR).
   * Avulso: cria CashMovement de ENTRY direto.
   */
  private async processPixIn(event: NormalizedPixIn) {
    // Idempotência por txid
    const existing = await this.prisma.cashMovement.findFirst({
      where: { referenceCode: event.txid },
    });
    if (existing) {
      this.logger.log(`PIX ${event.txid} já processado — ignorado.`);
      return { refType: 'CashMovement', refId: existing.id };
    }

    // 1) Tenta achar Boleto vinculado pelo refExternalId ou nossoNumero
    if (event.refExternalId) {
      const boleto = await this.prisma.boleto.findFirst({
        where: {
          OR: [
            { id: event.refExternalId },
            { providerBoletoId: event.refExternalId },
            { nossoNumero: event.refExternalId },
          ],
        },
      });
      if (boleto && boleto.status !== 'PAID' && boleto.status !== 'CANCELED') {
        // Marca como pago — vai criar PaymentReceipt + CashMovement + atualizar AR
        // se houver vínculo. Delegamos pro BoletosService via prisma direto pra
        // evitar dependência circular nesse módulo de webhook.
        return this.markBoletoPaidDirect(boleto.id, event.amount, event.paidAt);
      }
    }

    // 2) PIX avulso — cria CashMovement direto. Precisa achar a empresa.
    // Heurística: pega a Company mais antiga (single-tenant ainda).
    // Em multi-tenant real, o webhook precisaria do companyId no path
    // (ex: /api/webhooks/pix/itau/:companyId).
    const company = await this.prisma.company.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, Users: { take: 1, select: { id: true } } },
    });
    if (!company || company.Users.length === 0) {
      this.logger.warn('PIX avulso recebido mas sem empresa/usuário pra atribuir.');
      return null;
    }

    const movement = await this.prisma.cashMovement.create({
      data: {
        companyId: company.id,
        type: 'ENTRY',
        category: 'OTHER_IN',
        value: event.amount,
        description: `PIX recebido — ${event.payerName ?? 'sem identificação'}`,
        user_id: company.Users[0].id,
        typePayment: 'PIX',
        status: 'COMPLETED',
        referenceCode: event.txid,
        counterpartyName: event.payerName ?? null,
        counterpartyDocument: event.payerDocument ?? null,
        paidAt: event.paidAt,
        date: event.paidAt,
      },
    });

    return { refType: 'CashMovement', refId: movement.id };
  }

  private async processBoletoPaid(event: NormalizedBoletoPaid) {
    const boleto = await this.prisma.boleto.findFirst({
      where: {
        nossoNumero: event.nossoNumero,
        provider: event.provider,
      },
    });
    if (!boleto) {
      this.logger.warn(`Boleto ${event.nossoNumero} (${event.provider}) não encontrado.`);
      return null;
    }
    if (boleto.status === 'PAID') {
      return { refType: 'Boleto', refId: boleto.id };
    }
    return this.markBoletoPaidDirect(boleto.id, event.amount, event.paidAt);
  }

  /**
   * Implementação inline da lógica "marcar boleto pago" — espelho de
   * BoletosService.markPaid pra evitar dep circular do módulo de webhook.
   */
  private async markBoletoPaidDirect(boletoId: string, amount: number, paidAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      const boleto = await tx.boleto.update({
        where: { id: boletoId },
        data: { status: 'PAID', paidAt },
      });

      if (!boleto.accountReceivableId) {
        await tx.boletoEvent.create({
          data: {
            boletoId,
            companyId: boleto.companyId,
            kind: 'PAID',
            payload: { source: 'webhook', amount, paidAt } as any,
          },
        });
        return { refType: 'Boleto', refId: boleto.id };
      }

      const ar = await tx.accountReceivable.findFirst({
        where: { id: boleto.accountReceivableId, companyId: boleto.companyId },
        include: { customer: true },
      });
      if (!ar || ar.status === 'PAID') {
        return { refType: 'Boleto', refId: boleto.id };
      }

      // Pega 1º user da empresa pra atribuir o movimento (user "sistema")
      const sysUser = await tx.users.findFirst({
        where: { company_id: boleto.companyId, is_active: true },
        select: { id: true },
      });
      if (!sysUser) return { refType: 'Boleto', refId: boleto.id };

      const newPaid = Number(ar.paidAmount) + amount;
      const willComplete = newPaid >= Number(ar.amount) - 0.001;

      const movement = await tx.cashMovement.create({
        data: {
          companyId: boleto.companyId,
          type: 'ENTRY',
          category: 'SALE',
          value: amount,
          description: `Recebimento boleto (webhook) — ${ar.description}`,
          user_id: sysUser.id,
          typePayment: 'BANK_SLIP',
          bankId: boleto.bankId,
          status: 'COMPLETED',
          referenceCode: boleto.nossoNumero ?? `BOL-${boleto.id.slice(0, 8)}`,
          counterpartyName: ar.customer?.name ?? null,
          counterpartyDocument: ar.customer?.document ?? null,
          accountReceivableId: ar.id,
          customerId: ar.customerId,
          paidAt,
          date: paidAt,
        },
      });

      await tx.paymentReceipt.create({
        data: {
          companyId: boleto.companyId,
          accountReceivableId: ar.id,
          amount,
          paymentMethod: 'BANK_SLIP',
          bankId: boleto.bankId,
          paidAt,
          cashMovementId: movement.id,
          notes: `Pagamento via boleto ${boleto.nossoNumero ?? boleto.id.slice(0, 8)} (webhook automático)`,
          createdByUserId: sysUser.id,
        },
      });

      await tx.accountReceivable.update({
        where: { id: ar.id },
        data: {
          paidAmount: newPaid,
          ...(willComplete ? { status: 'PAID', paidAt } : {}),
        },
      });

      await tx.boletoEvent.create({
        data: {
          boletoId,
          companyId: boleto.companyId,
          kind: 'PAID',
          payload: { source: 'webhook', amount, paidAt, autoMatched: true } as any,
        },
      });

      return { refType: 'Boleto', refId: boleto.id };
    });
  }
}
