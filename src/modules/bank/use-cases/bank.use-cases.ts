import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
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

@Injectable()
export class BankUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    args: { search?: string; activeOnly?: boolean } = {},
  ): Promise<BankEntity[]> {
    const banks = await this.prisma.bank.findMany({
      where: {
        user_id: userId,
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

  async findById(userId: string, id: string): Promise<BankEntity> {
    const bank = await this.prisma.bank.findUnique({ where: { id } });
    if (!bank || bank.user_id !== userId) {
      throw new NotFoundException('Banco não encontrado.');
    }
    return toEntity(bank);
  }

  async create(userId: string, input: CreateBankInput): Promise<BankEntity> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException('Nome do banco é obrigatório.');
    }

    const bank = await this.prisma.bank.create({
      data: {
        user_id: userId,
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
    return toEntity(bank);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateBankInput,
  ): Promise<BankEntity> {
    const existing = await this.prisma.bank.findUnique({ where: { id } });
    if (!existing || existing.user_id !== userId) {
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
    return toEntity(updated);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.bank.findUnique({ where: { id } });
    if (!existing || existing.user_id !== userId) {
      throw new NotFoundException('Banco não encontrado.');
    }

    const inUse = await this.prisma.cashMovement.findFirst({
      where: { bankId: id },
      select: { id: true },
    });

    if (inUse) {
      await this.prisma.bank.update({
        where: { id },
        data: { ativo: false },
      });
      return true;
    }

    await this.prisma.bank.delete({ where: { id } });
    return true;
  }
}
