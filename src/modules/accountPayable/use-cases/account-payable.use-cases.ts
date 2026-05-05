import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { CreateAccountPayableInput } from '../dto/create-account-payable.input';
import { UpdateAccountPayableInput } from '../dto/update-account-payable.input';
import { AccountPayableEntity } from '../entities/account-payable.entity';

type RawAccount = Prisma.AccountPayableGetPayload<{
  include: { supplier: true; product: { include: { images: true } } };
}>;

type RawAccountBase = Prisma.AccountPayableGetPayload<{}>;

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
  const finalAmount = amount * Math.pow(1 + interestRate, days);
  return {
    finalAmount: Number(finalAmount.toFixed(2)),
    interestAccrued: Number((finalAmount - amount).toFixed(2)),
    daysOverdue: days,
  };
}

function toEntity(raw: RawAccount): AccountPayableEntity {
  const amount = Number(raw.amount);
  const interestRate = Number(raw.interestRate);
  const calc = calculateInterest(amount, raw.dueDate, interestRate, raw.status);

  return {
    id: raw.id,
    supplierId: raw.supplierId,
    productId: raw.productId,
    supplierName: raw.supplierName,
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
    supplier: raw.supplier
      ? {
          id: raw.supplier.id,
          name: raw.supplier.name,
          email: raw.supplier.email,
          phone: raw.supplier.phone,
        }
      : null,
    product: raw.product as any,
  };
}

function toAuditSnapshot(
  raw: RawAccount | RawAccountBase,
): Record<string, unknown> {
  return {
    ...raw,
    amount: Number(raw.amount),
    interestRate: Number(raw.interestRate),
  };
}

@Injectable()
export class AccountPayableUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(args: {
    status?: AccountStatus;
    search?: string;
  } = {}): Promise<AccountPayableEntity[]> {
    const records = await this.prisma.accountPayable.findMany({
      where: {
        ...(args.status ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { description: { contains: args.search, mode: 'insensitive' } },
                { supplierName: { contains: args.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { supplier: true, product: { include: { images: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return records.map(toEntity);
  }

  async findById(id: string): Promise<AccountPayableEntity> {
    const record = await this.prisma.accountPayable.findUnique({
      where: { id },
      include: { supplier: true, product: { include: { images: true } } },
    });
    if (!record) throw new NotFoundException('Conta a pagar não encontrada.');
    return toEntity(record);
  }

  async create(
    actor: AuditActor,
    input: CreateAccountPayableInput,
  ): Promise<AccountPayableEntity> {
    const created = await this.prisma.accountPayable.create({
      data: {
        supplierId: input.supplierId ?? null,
        productId: input.productId ?? null,
        supplierName: input.supplierName,
        description: input.description,
        amount: input.amount,
        interestRate: input.interestRate,
        dueDate: new Date(input.dueDate),
        status: input.status,
        notes: input.notes ?? null,
      },
      include: { supplier: true, product: { include: { images: true } } },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'AccountPayable',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: toAuditSnapshot(created),
    });

    return toEntity(created);
  }

  async update(
    actor: AuditActor,
    input: UpdateAccountPayableInput,
  ): Promise<AccountPayableEntity> {
    const existing = await this.prisma.accountPayable.findUnique({
      where: { id: input.id },
      include: { supplier: true, product: { include: { images: true } } },
    });
    if (!existing) throw new NotFoundException('Conta a pagar não encontrada.');

    const data: Prisma.AccountPayableUpdateInput = {};
    if (input.supplierId !== undefined) {
      data.supplier = input.supplierId
        ? { connect: { id: input.supplierId } }
        : { disconnect: true };
    }
    if (input.productId !== undefined) {
      data.product = input.productId
        ? { connect: { id: input.productId } }
        : { disconnect: true };
    }
    if (input.supplierName !== undefined) data.supplierName = input.supplierName;
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

    const updated = await this.prisma.accountPayable.update({
      where: { id: input.id },
      data,
      include: { supplier: true, product: { include: { images: true } } },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'AccountPayable',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(updated),
    });

    return toEntity(updated);
  }

  async delete(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.accountPayable.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Conta a pagar não encontrada.');

    await this.prisma.accountPayable.delete({ where: { id } });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'AccountPayable',
      entityId: id,
      action: AuditAction.DELETE,
      before: toAuditSnapshot(existing),
    });

    return true;
  }

  async summary(): Promise<{
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    countTotal: number;
  }> {
    const records = await this.prisma.accountPayable.findMany({});
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
