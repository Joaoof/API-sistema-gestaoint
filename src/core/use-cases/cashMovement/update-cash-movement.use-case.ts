import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementRepository } from '../../ports/cash-movement.repository';
import { UpdateCashMovementInput } from './dtos/update-cash-movement.input';

@Injectable()
export class UpdateCashMovementUseCase {
  constructor(
    @Inject('CashMovementRepository')
    private readonly cashMovementRepository: CashMovementRepository,
  ) {}

  async execute(
    movementId: string,
    movement: UpdateCashMovementInput,
    userId?: string,
  ): Promise<boolean> {
    const cashMovement = await this.cashMovementRepository.findById(movementId);

    if (!cashMovement) {
      throw new NotFoundException('Movimentação não encontrada.');
    }

    if (userId && cashMovement.user_id !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar esse movimento.',
      );
    }

    if (movement.value !== undefined && movement.value <= 0) {
      throw new NotFoundException('O valor precisa ser positivo.');
    }

    return this.cashMovementRepository.updateMovement(movementId, movement);
  }
}
