import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BoletoProviderRegistry } from '../providers/boleto-provider.registry';

interface ActorContext {
  userId: string;
  companyId: string;
}

interface IssueBoletoInput {
  /** Conta a receber que origina o boleto. Recomendado mas opcional. */
  accountReceivableId?: string;
  customerId?: string;
  bankId: string;
  /** Se omitido, usa BOLETO_PROVIDER ou MOCK. */
  provider?: string;
  amount: number;
  dueDate: Date;
  payerName: string;
  payerDocument: string;
  instructions?: string | null;
}

@Injectable()
export class BoletosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: BoletoProviderRegistry,
  ) {}

  async issue(actor: ActorContext, input: IssueBoletoInput) {
    const bank = await this.prisma.bank.findFirst({
      where: { id: input.bankId, companyId: actor.companyId },
    });
    if (!bank) throw new NotFoundException('Banco não encontrado.');

    if (input.accountReceivableId) {
      const ar = await this.prisma.accountReceivable.findFirst({
        where: { id: input.accountReceivableId, companyId: actor.companyId },
      });
      if (!ar) throw new NotFoundException('Conta a receber não encontrada.');
      if (ar.status === 'PAID' || ar.status === 'CANCELED') {
        throw new BadRequestException(
          `Não é possível emitir boleto para conta em status ${ar.status}.`,
        );
      }
    }

    const providerName = (input.provider ?? this.registry.defaultProviderName()).toUpperCase();
    const provider = this.registry.get(providerName);

    // 1) Cria registro DRAFT
    const draft = await this.prisma.boleto.create({
      data: {
        companyId: actor.companyId,
        accountReceivableId: input.accountReceivableId ?? null,
        customerId: input.customerId ?? null,
        bankId: input.bankId,
        provider: providerName,
        amount: input.amount,
        dueDate: input.dueDate,
        status: 'DRAFT',
        payerName: input.payerName,
        payerDocument: input.payerDocument,
        instructions: input.instructions ?? null,
        createdByUserId: actor.userId,
      },
    });

    await this.prisma.boletoEvent.create({
      data: {
        boletoId: draft.id,
        companyId: actor.companyId,
        kind: 'REQUESTED',
        payload: { ...input } as any,
      },
    });

    // 2) Chama o provider — atualiza pra REGISTERED ou ERROR
    try {
      const out = await provider.register({
        amount: input.amount,
        dueDate: input.dueDate,
        payerName: input.payerName,
        payerDocument: input.payerDocument,
        instructions: input.instructions ?? null,
        externalRef: draft.id,
        bankRef: {
          id: bank.id,
          pixKey: bank.pixKey,
          agencia: bank.agencia,
          conta: bank.conta,
        },
      });

      const updated = await this.prisma.boleto.update({
        where: { id: draft.id },
        data: {
          status: 'REGISTERED',
          providerBoletoId: out.providerBoletoId,
          nossoNumero: out.nossoNumero,
          barcode: out.barcode,
          digitableLine: out.digitableLine,
          pdfUrl: out.pdfUrl ?? null,
          registeredAt: new Date(),
          errorMessage: null,
        },
      });

      await this.prisma.boletoEvent.create({
        data: {
          boletoId: draft.id,
          companyId: actor.companyId,
          kind: 'REGISTERED',
          payload: (out.raw as any) ?? {},
        },
      });

      return updated;
    } catch (err: any) {
      const message = err?.message ?? 'Falha ao registrar boleto no provider.';
      await this.prisma.boleto.update({
        where: { id: draft.id },
        data: { status: 'ERROR', errorMessage: message },
      });
      await this.prisma.boletoEvent.create({
        data: {
          boletoId: draft.id,
          companyId: actor.companyId,
          kind: 'ERROR',
          payload: { message } as any,
        },
      });
      throw err;
    }
  }

  async cancel(actor: ActorContext, id: string) {
    const boleto = await this.prisma.boleto.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!boleto) throw new NotFoundException('Boleto não encontrado.');
    if (boleto.status === 'PAID') {
      throw new BadRequestException('Boleto já pago não pode ser cancelado.');
    }
    if (boleto.status === 'CANCELED') {
      return boleto;
    }

    const provider = this.registry.get(boleto.provider);
    if (boleto.providerBoletoId) {
      const out = await provider.cancel({ providerBoletoId: boleto.providerBoletoId });
      if (!out.ok) {
        throw new BadRequestException('Provider rejeitou o cancelamento.');
      }
    }

    const updated = await this.prisma.boleto.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    await this.prisma.boletoEvent.create({
      data: {
        boletoId: id,
        companyId: actor.companyId,
        kind: 'CANCELED',
        payload: {} as any,
      },
    });
    return updated;
  }

  /**
   * Marca boleto como PAGO (chamado pelo webhook do banco OU manualmente
   * pelo admin). Se houver AR vinculado, registra um PaymentReceipt.
   */
  async markPaid(
    actor: ActorContext,
    id: string,
    args?: { paidAt?: Date; amountPaid?: number },
  ) {
    const boleto = await this.prisma.boleto.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!boleto) throw new NotFoundException('Boleto não encontrado.');
    if (boleto.status === 'PAID') return boleto;

    const paidAt = args?.paidAt ?? new Date();
    const amount = args?.amountPaid ?? Number(boleto.amount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.boleto.update({
        where: { id },
        data: { status: 'PAID', paidAt },
      });

      // Se vinculado a AR, registra PaymentReceipt + CashMovement
      if (boleto.accountReceivableId) {
        const ar = await tx.accountReceivable.findFirst({
          where: { id: boleto.accountReceivableId, companyId: actor.companyId },
          include: { customer: true },
        });
        if (ar && ar.status !== 'PAID') {
          const newPaid = Number(ar.paidAmount) + amount;
          const willComplete = newPaid >= Number(ar.amount) - 0.001;

          const movement = await tx.cashMovement.create({
            data: {
              companyId: actor.companyId,
              type: 'ENTRY',
              category: 'SALE',
              value: amount,
              description: `Recebimento boleto — ${ar.description}`,
              user_id: actor.userId,
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
              companyId: actor.companyId,
              accountReceivableId: ar.id,
              amount,
              paymentMethod: 'BANK_SLIP',
              bankId: boleto.bankId,
              paidAt,
              cashMovementId: movement.id,
              notes: `Pagamento via boleto ${boleto.nossoNumero ?? boleto.id.slice(0, 8)}`,
              createdByUserId: actor.userId,
            },
          });

          await tx.accountReceivable.update({
            where: { id: ar.id },
            data: {
              paidAmount: newPaid,
              ...(willComplete ? { status: 'PAID', paidAt } : {}),
            },
          });
        }
      }

      await tx.boletoEvent.create({
        data: {
          boletoId: id,
          companyId: actor.companyId,
          kind: 'PAID',
          payload: { paidAt, amount } as any,
        },
      });

      return updated;
    });
  }

  async list(companyId: string, filters?: { status?: string }) {
    return this.prisma.boleto.findMany({
      where: {
        companyId,
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findById(companyId: string, id: string) {
    const b = await this.prisma.boleto.findFirst({
      where: { id, companyId },
      include: { events: { orderBy: { createdAt: 'desc' } } },
    });
    if (!b) throw new NotFoundException('Boleto não encontrado.');
    return b;
  }
}
