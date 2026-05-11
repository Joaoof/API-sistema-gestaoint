import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementTypePayment } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

interface RecordPaymentArgs {
  amount: number;
  paymentMethod: MovementTypePayment;
  bankId?: string | null;
  paidAt?: Date | null;
  notes?: string | null;
}

interface ActorContext {
  userId: string;
  companyId: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um pagamento (total ou parcial) em uma AccountReceivable.
   * - Cria PaymentReceipt
   * - Cria CashMovement de ENTRY referenciado
   * - Atualiza AR.paidAmount; se ≥ amount, marca status=PAID
   * - Tudo em transaction
   */
  async recordReceivablePayment(
    actor: ActorContext,
    receivableId: string,
    args: RecordPaymentArgs,
  ) {
    if (args.amount <= 0) {
      throw new BadRequestException('Valor do pagamento deve ser maior que zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      const ar = await tx.accountReceivable.findFirst({
        where: { id: receivableId, companyId: actor.companyId },
        include: { customer: { select: { name: true, document: true } } },
      });
      if (!ar) throw new NotFoundException('Conta a receber não encontrada.');
      if (ar.status === 'PAID') {
        throw new BadRequestException('Esta conta já está totalmente paga.');
      }
      if (ar.status === 'CANCELED') {
        throw new BadRequestException('Conta cancelada não pode receber pagamento.');
      }

      const currentPaid = Number(ar.paidAmount);
      const remaining = Number(ar.amount) - currentPaid;
      if (args.amount > remaining + 0.001) {
        throw new BadRequestException(
          `Valor (R$ ${args.amount.toFixed(2)}) maior que o saldo devedor (R$ ${remaining.toFixed(2)}).`,
        );
      }

      const newPaid = currentPaid + args.amount;
      const willComplete = newPaid >= Number(ar.amount) - 0.001;
      const paidAt = args.paidAt ?? new Date();

      // 1) CashMovement de entrada
      const movement = await tx.cashMovement.create({
        data: {
          companyId: actor.companyId,
          type: 'ENTRY',
          category: 'SALE',
          value: args.amount,
          description: willComplete
            ? `Recebimento (quitação) — ${ar.description}`
            : `Recebimento parcial — ${ar.description}`,
          user_id: actor.userId,
          typePayment: args.paymentMethod,
          bankId: args.bankId ?? null,
          status: 'COMPLETED',
          referenceCode: `AR-${ar.id.slice(0, 8)}`,
          counterpartyName: ar.customer?.name ?? null,
          counterpartyDocument: ar.customer?.document ?? null,
          accountReceivableId: ar.id,
          customerId: ar.customerId,
          orderId: ar.orderId ?? null,
          paidAt,
          date: paidAt,
          notes: args.notes ?? null,
        },
      });

      // 2) Receipt
      const receipt = await tx.paymentReceipt.create({
        data: {
          companyId: actor.companyId,
          accountReceivableId: ar.id,
          amount: args.amount,
          paymentMethod: args.paymentMethod,
          bankId: args.bankId ?? null,
          paidAt,
          notes: args.notes ?? null,
          cashMovementId: movement.id,
          createdByUserId: actor.userId,
        },
      });

      // 3) AR atualizado
      const updatedAR = await tx.accountReceivable.update({
        where: { id: ar.id },
        data: {
          paidAmount: newPaid,
          ...(willComplete ? { status: 'PAID', paidAt } : {}),
        },
      });

      // Se quitou totalmente e a conta tinha Order vinculada, marca Order como PAID
      if (willComplete && ar.orderId) {
        await tx.order
          .update({ where: { id: ar.orderId }, data: { status: 'PAID' } })
          .catch(() => undefined);
      }

      return { receipt, accountReceivable: updatedAR, cashMovement: movement };
    });
  }

  /** Mesma lógica do AR, mas para AccountPayable (EXIT). */
  async recordPayablePayment(
    actor: ActorContext,
    payableId: string,
    args: RecordPaymentArgs,
  ) {
    if (args.amount <= 0) {
      throw new BadRequestException('Valor do pagamento deve ser maior que zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      const ap = await tx.accountPayable.findFirst({
        where: { id: payableId, companyId: actor.companyId },
        include: { supplier: { select: { name: true } } },
      });
      if (!ap) throw new NotFoundException('Conta a pagar não encontrada.');
      if (ap.status === 'PAID') {
        throw new BadRequestException('Esta conta já está totalmente paga.');
      }
      if (ap.status === 'CANCELED') {
        throw new BadRequestException('Conta cancelada não pode ter pagamento.');
      }

      const currentPaid = Number(ap.paidAmount);
      const remaining = Number(ap.amount) - currentPaid;
      if (args.amount > remaining + 0.001) {
        throw new BadRequestException(
          `Valor (R$ ${args.amount.toFixed(2)}) maior que o saldo a pagar (R$ ${remaining.toFixed(2)}).`,
        );
      }

      const newPaid = currentPaid + args.amount;
      const willComplete = newPaid >= Number(ap.amount) - 0.001;
      const paidAt = args.paidAt ?? new Date();
      const supplierName = ap.supplier?.name ?? ap.supplierName;

      const movement = await tx.cashMovement.create({
        data: {
          companyId: actor.companyId,
          type: 'EXIT',
          category: 'PAYMENT',
          value: args.amount,
          description: willComplete
            ? `Pagamento (quitação) — ${supplierName} — ${ap.description}`
            : `Pagamento parcial — ${supplierName} — ${ap.description}`,
          user_id: actor.userId,
          typePayment: args.paymentMethod,
          bankId: args.bankId ?? null,
          status: 'COMPLETED',
          referenceCode: `AP-${ap.id.slice(0, 8)}`,
          counterpartyName: supplierName,
          accountPayableId: ap.id,
          paidAt,
          date: paidAt,
          notes: args.notes ?? null,
        },
      });

      const receipt = await tx.paymentReceipt.create({
        data: {
          companyId: actor.companyId,
          accountPayableId: ap.id,
          amount: args.amount,
          paymentMethod: args.paymentMethod,
          bankId: args.bankId ?? null,
          paidAt,
          notes: args.notes ?? null,
          cashMovementId: movement.id,
          createdByUserId: actor.userId,
        },
      });

      const updatedAP = await tx.accountPayable.update({
        where: { id: ap.id },
        data: {
          paidAmount: newPaid,
          ...(willComplete ? { status: 'PAID', paidAt } : {}),
        },
      });

      return { receipt, accountPayable: updatedAP, cashMovement: movement };
    });
  }

  async listReceivableReceipts(companyId: string, accountReceivableId: string) {
    return this.prisma.paymentReceipt.findMany({
      where: { companyId, accountReceivableId },
      orderBy: { paidAt: 'desc' },
    });
  }

  async listPayableReceipts(companyId: string, accountPayableId: string) {
    return this.prisma.paymentReceipt.findMany({
      where: { companyId, accountPayableId },
      orderBy: { paidAt: 'desc' },
    });
  }
}
