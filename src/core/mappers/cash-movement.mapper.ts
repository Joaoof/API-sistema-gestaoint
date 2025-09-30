import { CashMovement } from '../entities/movements/cash-movement.entity';
import { CreateCashMovementDto } from '../dtos/create-cash-movement.core-dto';
import { randomUUID } from 'crypto';

export class CashMovementMapper {
  static toDomain(dto: CreateCashMovementDto, userId: string): CashMovement {
    return new CashMovement(
      randomUUID(),
      dto.type,
      dto.category,
      dto.value,
      dto.description,
      new Date(),
      dto.user_id ?? userId,
    );
  }

  static toJSON(movement: CashMovement): any {
    return {
      id: movement.id,
      type: movement.type,
      category: movement.category,
      value: movement.value,
      description: movement.description,
      date: new Date(movement.date),
      user_id: movement.user_id ?? '',
    };
  }
}
