import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateAccountReceivableInput } from '../dto/create-account-receivable.input';
import { UpdateAccountReceivableInput } from '../dto/update-account-receivable.input';
import { AccountReceivableEntity } from '../entities/account-receivable.entity';

type RawAccount = Prisma.AccountReceivableGetPayload<{
  include: { customer: true; product: { include: { images: true } } };
}>;

const PAID_STATUSES = new Set<AccountStatus>([
  AccountStatus.PAID,
  AccountStatus.CANCELED,
]);

function calculateInterest(
  amount: number,
  dueDate: Date,
  interestRate: number,
  status: AccountStatus,
): { finalAmount: number; interestAccrued: number; daysOverdue: number } {
  const today = new Date();
  const due = new Date(dueDate);
  const ms = today.getTime() - due.getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));

  if (PAID_STATUSES.has(status) || days === 0) {
    return { finalAmount: amount, interestAccrued: 0, daysOverdue: days };
  }

  // Compound interest per day, where interestRate represents fraction per day
  const finalAmount = amount * Math.pow(1 + interestRate, days);
  return {
    finalAmount: Number(finalAmount.toFixed(2)),
    interestAccrued: Number((finalAmount - amount).toFixed(2)),
    daysOverdue: days,
  };
}

function toEntity(raw: RawAccount): AccountReceivableEntity {
  const amount = Number(raw.amount);
  const interestRate = Number(raw.interestRate);
  const calc = calculateInterest(amount, raw.dueDate, interestRate, raw.status);

  return {
    id: raw.id,
    customerId: raw.customerId,
    productId: raw.productId,
    description: raw.description,
    amount,
    interestRate,
    dueDate: raw.dueDate,
    paidAt: raw.paidAt,
    status: raw.status,
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    finalAmount: calc.finalAmount,
    interestAccrued: calc.interestAccrued,
    daysOverdue: calc.daysOverdue,
    customer: raw.customer as any,
    product: raw.product as any,
  };
}

@Injectable()
export class AccountReceivableUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: {
    status?: AccountStatus;
    search?: string;
  } = {}): Promise<AccountReceivableEntity[]> {
    const records = await this.prisma.accountReceivable.findMany({
      where: {
        ...(args.status ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { description: { contains: args.search, mode: 'insensitive' } },
                {
                  customer: {
                    name: { contains: args.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: { customer: true, product: { include: { images: true } } },
      orderBy: { dueDate: 'asc' },
    });

    return records.map(toEntity);
  }

  async findById(id: string): Promise<AccountReceivableEntity> {
    const record = await this.prisma.accountReceivable.findUnique({
      where: { id },
      include: { customer: true, product: { include: { images: true } } },
    });
    if (!record) throw new NotFoundException('Conta a receber não encontrada.');
    return toEntity(record);
  }

  async create(
    input: CreateAccountReceivableInput,
  ): Promise<AccountReceivableEntity> {
    const created = await this.prisma.accountReceivable.create({
      data: {
        customerId: input.customerId,
        productId: input.productId ?? null,
        description: input.description,
        amount: input.amount,
        interestRate: input.interestRate,
        dueDate: new Date(input.dueDate),
        status: input.status,
        notes: input.notes ?? null,
      },
      include: { customer: true, product: { include: { images: true } } },
    });
    return toEntity(created);
  }

  async update(
    input: UpdateAccountReceivableInput,
  ): Promise<AccountReceivableEntity> {
    const existing = await this.prisma.accountReceivable.findUnique({
      where: { id: input.id },
    });
    if (!existing) throw new NotFoundException('Conta a receber não encontrada.');

    const data: Prisma.AccountReceivableUpdateInput = {};
    if (input.customerId !== undefined)
      data.customer = { connect: { id: input.customerId } };
    if (input.productId !== undefined) {
      data.product = input.productId
        ? { connect: { id: input.productId } }
        : { disconnect: true };
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.interestRate !== undefined) data.interestRate = input.interestRate;
    if (input.dueDate !== undefined) data.dueDate = new Date(input.dueDate);
    if (input.paidAt !== undefined)
      data.paidAt = input.paidAt ? new Date(input.paidAt) : null;
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === AccountStatus.PAID && !input.paidAt) {
        data.paidAt = new Date();
      }
    }
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await this.prisma.accountReceivable.update({
      where: { id: input.id },
      data,
      include: { customer: true, product: { include: { images: true } } },
    });

    return toEntity(updated);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.accountReceivable.delete({ where: { id } });
    return true;
  }

  async summary(): Promise<{
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    countTotal: number;
  }> {
    const records = await this.prisma.accountReceivable.findMany({});
    let total = 0;
    let pending = 0;
    let paid = 0;
    let overdue = 0;
    const today = new Date();

    for (const r of records) {
      const amount = Number(r.amount);
      total += amount;
      if (r.status === AccountStatus.PAID) {
        paid += amount;
      } else if (
        r.status === AccountStatus.OVERDUE ||
        (r.status === AccountStatus.PENDING && r.dueDate < today)
      ) {
        overdue += amount;
      } else if (r.status === AccountStatus.PENDING) {
        pending += amount;
      }
    }

    return { total, pending, paid, overdue, countTotal: records.length };
  }
}
