import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { CreateBankInput, UpdateBankInput } from '../dto/create-bank.input';
import { BankEntity } from '../entities/bank.entity';

type RawBank = Prisma.BankGetPayload<{}>;

function toEntity(raw: RawBank): BankEntity {
  return {
    id: raw.id,
    name: raw.name,
    tipo: raw.tipo,
    agencia: raw.agencia,
    conta: raw.conta,
    digito: raw.digito,
    titular: raw.titular,
    documento: raw.documento,
    pixKey: raw.pixKey,
    saldoInicial: Number(raw.saldoInicial),
    corHex: raw.corHex,
    ativo: raw.ativo,
    observacoes: raw.observacoes,
    user_id: raw.user_id,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toAuditSnapshot(raw: RawBank): Record<string, unknown> {
  return {
    ...raw,
    saldoInicial: Number(raw.saldoInicial),
  };
}

@Injectable()
export class BankUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    companyId: string,
    args: { search?: string; activeOnly?: boolean } = {},
  ): Promise<BankEntity[]> {
    const banks = await this.prisma.bank.findMany({
      where: {
        companyId,
        ...(args.activeOnly ? { ativo: true } : {}),
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: 'insensitive' } },
                { titular: { contains: args.search, mode: 'insensitive' } },
                { conta: { contains: args.search, mode: 'insensitive' } },
                { pixKey: { contains: args.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ ativo: 'desc' }, { name: 'asc' }],
      take: 200,
    });
    return banks.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<BankEntity> {
    const bank = await this.prisma.bank.findFirst({ where: { id, companyId } });
    if (!bank) {
      throw new NotFoundException('Banco não encontrado.');
    }
    return toEntity(bank);
  }

  async create(actor: AuditActor, input: CreateBankInput): Promise<BankEntity> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException('Nome do banco é obrigatório.');
    }

    const bank = await this.prisma.bank.create({
      data: {
        companyId: actor.companyId,
        user_id: actor.userId,
        name: input.name.trim(),
        tipo: input.tipo,
        agencia: input.agencia ?? null,
        conta: input.conta ?? null,
        digito: input.digito ?? null,
        titular: input.titular ?? null,
        documento: input.documento ?? null,
        pixKey: input.pixKey ?? null,
        saldoInicial: input.saldoInicial,
        corHex: input.corHex,
        ativo: input.ativo,
        observacoes: input.observacoes ?? null,
      },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Bank',
      entityId: bank.id,
      action: AuditAction.CREATE,
      after: toAuditSnapshot(bank),
    });

    return toEntity(bank);
  }

  async update(
    actor: AuditActor,
    id: string,
    input: UpdateBankInput,
  ): Promise<BankEntity> {
    const existing = await this.prisma.bank.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) {
      throw new NotFoundException('Banco não encontrado.');
    }

    const updated = await this.prisma.bank.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
        ...(input.agencia !== undefined ? { agencia: input.agencia } : {}),
        ...(input.conta !== undefined ? { conta: input.conta } : {}),
        ...(input.digito !== undefined ? { digito: input.digito } : {}),
        ...(input.titular !== undefined ? { titular: input.titular } : {}),
        ...(input.documento !== undefined
          ? { documento: input.documento }
          : {}),
        ...(input.pixKey !== undefined ? { pixKey: input.pixKey } : {}),
        ...(input.saldoInicial !== undefined
          ? { saldoInicial: input.saldoInicial }
          : {}),
        ...(input.corHex !== undefined ? { corHex: input.corHex } : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
        ...(input.observacoes !== undefined
          ? { observacoes: input.observacoes }
          : {}),
      },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Bank',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(updated),
    });

    return toEntity(updated);
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.bank.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) {
      throw new NotFoundException('Banco não encontrado.');
    }

    const inUse = await this.prisma.cashMovement.findFirst({
      where: { bankId: id },
      select: { id: true },
    });

    if (inUse) {
      const softDeleted = await this.prisma.bank.update({
        where: { id },
        data: { ativo: false },
      });
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Bank',
        entityId: id,
        action: AuditAction.SOFT_DELETE,
        before: toAuditSnapshot(existing),
        after: toAuditSnapshot(softDeleted),
        reason: 'Banco em uso por movimentações; desativado em vez de excluído.',
      });
      return true;
    }

    await this.prisma.bank.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Bank',
      entityId: id,
      action: AuditAction.DELETE,
      before: toAuditSnapshot(existing),
    });
    return true;
  }
}
