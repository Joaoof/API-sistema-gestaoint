import { CashMovement } from '../entities/movements/cash-movement.entity';
import { CreateCashMovementParsed } from '../dtos/create-cash-movement.core-dto';
import { randomUUID } from 'crypto';
import { MovementStatus } from '@prisma/client';

export class CashMovementMapper {
  static toDomain(
    dto: CreateCashMovementParsed,
    userId: string,
  ): CashMovement {
    return new CashMovement({
      id: randomUUID(),
      type: dto.type,
      category: dto.category,
      typePayment: dto.typePayment ?? null,
      value: dto.value,
      description: dto.description,
      date: dto.date,
      user_id: dto.user_id ?? userId,
      bankId: dto.bankId ?? null,
      status: dto.status ?? MovementStatus.COMPLETED,
      referenceCode: dto.referenceCode ?? null,
      counterpartyName: dto.counterpartyName ?? null,
      counterpartyDocument: dto.counterpartyDocument ?? null,
      notes: dto.notes ?? null,
      attachmentUrl: dto.attachmentUrl ?? null,
      dueDate: dto.dueDate ?? null,
      paidAt: dto.paidAt ?? null,
    });
  }

  static toJSON(movement: CashMovement) {
    return {
      id: movement.id,
      type: movement.type,
      category: movement.category,
      typePayment: movement.typePayment,
      value: movement.value,
      description: movement.description,
      date: new Date(movement.date),
      user_id: movement.user_id ?? '',
      bankId: movement.bankId ?? null,
      status: movement.status,
      referenceCode: movement.referenceCode,
      counterpartyName: movement.counterpartyName,
      counterpartyDocument: movement.counterpartyDocument,
      notes: movement.notes,
      attachmentUrl: movement.attachmentUrl,
      dueDate: movement.dueDate,
      paidAt: movement.paidAt,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
    };
  }
}
