import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BankTransferInput } from '../dto/bank-transfer.input';

@Injectable()
export class BankTransferService {
  constructor(private readonly prisma: PrismaService) {}

  async transfer(input: BankTransferInput, userId: string): Promise<string> {
    if (input.fromBankId === input.toBankId) {
      throw new BadRequestException(
        'Banco de origem e destino devem ser diferentes.',
      );
    }
    if (input.value <= 0) {
      throw new BadRequestException('Valor deve ser maior que zero.');
    }

    const [from, to] = await Promise.all([
      this.prisma.bank.findUnique({ where: { id: input.fromBankId } }),
      this.prisma.bank.findUnique({ where: { id: input.toBankId } }),
    ]);
    if (!from) throw new NotFoundException('Banco de origem não encontrado.');
    if (!to) throw new NotFoundException('Banco de destino não encontrado.');

    const transferId = randomUUID();
    const date = input.date ? new Date(input.date) : new Date();
    const description = `Transferência entre bancos: ${from.name} → ${to.name}`;

    await this.prisma.$transaction([
      this.prisma.cashMovement.create({
        data: {
          type: 'EXIT',
          category: 'EXPENSE',
          value: input.value,
          description,
          user_id: userId,
          bankId: from.id,
          typePayment: 'BANK_TRANSFER',
          status: 'COMPLETED',
          referenceCode: `TRF-${transferId.slice(0, 8)}`,
          counterpartyName: to.name,
          notes: input.notes ?? null,
          transferId,
          date,
          paidAt: date,
        },
      }),
      this.prisma.cashMovement.create({
        data: {
          type: 'ENTRY',
          category: 'OTHER_IN',
          value: input.value,
          description,
          user_id: userId,
          bankId: to.id,
          typePayment: 'BANK_TRANSFER',
          status: 'COMPLETED',
          referenceCode: `TRF-${transferId.slice(0, 8)}`,
          counterpartyName: from.name,
          notes: input.notes ?? null,
          transferId,
          date,
          paidAt: date,
        },
      }),
    ]);

    return transferId;
  }
}
