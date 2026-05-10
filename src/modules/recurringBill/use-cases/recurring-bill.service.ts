import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateRecurringBillInput,
  UpdateRecurringBillInput,
} from '../dto/recurring-bill.input';
import { RecurringBillEntity } from '../entities/recurring-bill.entity';

function toEntity(raw: any): RecurringBillEntity {
  return {
    ...raw,
    amount: Number(raw.amount),
    interestRate: Number(raw.interestRate),
  };
}

function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class RecurringBillService implements OnModuleInit {
  private readonly logger = new Logger(RecurringBillService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Roda às 00:05 todos os dias para materializar contas fixas do mês.
    // Use RECURRING_BILLS_DISABLED=true para desligar.
    if (process.env.RECURRING_BILLS_DISABLED === 'true') return;
    cron.schedule('5 0 * * *', () => {
      this.materializeMonth().catch((err) =>
        this.logger.error(`materializeMonth failed: ${err}`),
      );
    });
    this.logger.log('Materializador de contas fixas agendado (00:05 diário).');
  }

  async list(): Promise<RecurringBillEntity[]> {
    const rows = await this.prisma.recurringBill.findMany({
      orderBy: [{ active: 'desc' }, { dayOfMonth: 'asc' }],
    });
    return rows.map(toEntity);
  }

  async create(input: CreateRecurringBillInput): Promise<RecurringBillEntity> {
    const created = await this.prisma.recurringBill.create({
      data: {
        supplierName: input.supplierName,
        description: input.description,
        amount: input.amount,
        dayOfMonth: input.dayOfMonth,
        interestRate: input.interestRate ?? 0.033,
        notes: input.notes ?? null,
      },
    });
    return toEntity(created);
  }

  async update(input: UpdateRecurringBillInput): Promise<RecurringBillEntity> {
    const existing = await this.prisma.recurringBill.findUnique({
      where: { id: input.id },
    });
    if (!existing) throw new NotFoundException('Conta fixa não encontrada.');

    const updated = await this.prisma.recurringBill.update({
      where: { id: input.id },
      data: {
        ...(input.supplierName !== undefined && { supplierName: input.supplierName }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.dayOfMonth !== undefined && { dayOfMonth: input.dayOfMonth }),
        ...(input.interestRate !== undefined && { interestRate: input.interestRate }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.active !== undefined && { active: input.active }),
      },
    });
    return toEntity(updated);
  }

  async remove(id: string): Promise<boolean> {
    await this.prisma.recurringBill.delete({ where: { id } });
    return true;
  }

  /**
   * Para cada conta fixa ativa, gera o AccountPayable do mês corrente caso
   * ainda não tenha sido gerado (controle por lastGeneratedFor=YYYY-MM).
   * Idempotente: pode rodar várias vezes ao dia sem duplicar.
   */
  async materializeMonth(today: Date = new Date()): Promise<number> {
    const ym = ymKey(today);
    const bills = await this.prisma.recurringBill.findMany({
      where: { active: true, lastGeneratedFor: { not: ym } },
    });

    let count = 0;
    for (const b of bills) {
      const year = today.getFullYear();
      const month0 = today.getMonth();
      const day = Math.min(b.dayOfMonth, lastDayOfMonth(year, month0));
      const dueDate = new Date(year, month0, day, 12, 0, 0);

      await this.prisma.accountPayable.create({
        data: {
          supplierName: b.supplierName,
          description: `${b.description} (recorrente ${ym})`,
          amount: b.amount,
          interestRate: b.interestRate,
          dueDate,
          status: 'PENDING',
          notes: b.notes,
        },
      });

      await this.prisma.recurringBill.update({
        where: { id: b.id },
        data: { lastGeneratedFor: ym },
      });

      count += 1;
    }

    if (count > 0) {
      this.logger.log(`Materializadas ${count} contas fixas para ${ym}.`);
    }
    return count;
  }
}
