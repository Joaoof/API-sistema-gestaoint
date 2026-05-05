import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { CashMovementRepository } from '../../ports/cash-movement.repository';
import { UpdateCashMovementInput } from './dtos/update-cash-movement.input';
import { AuditLogService } from '../../../modules/audit/use-cases/audit-log.service';
import { AuditActor } from '../../../modules/audit/types/actor';
import { CashMovementMapper } from '../../mappers/cash-movement.mapper';

@Injectable()
export class UpdateCashMovementUseCase {
  constructor(
    @Inject('CashMovementRepository')
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(
    actor: AuditActor,
    movementId: string,
    movement: UpdateCashMovementInput,
  ): Promise<boolean> {
    const cashMovement = await this.cashMovementRepository.findById(movementId);

    if (!cashMovement) {
      throw new NotFoundException('Movimentação não encontrada.');
    }

    if (cashMovement.user_id !== actor.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar esse movimento.',
      );
    }

    if (movement.value !== undefined && movement.value <= 0) {
      throw new NotFoundException('O valor precisa ser positivo.');
    }

    const ok = await this.cashMovementRepository.updateMovement(
      movementId,
      movement,
    );

    if (ok) {
      const updated = await this.cashMovementRepository.findById(movementId);
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'CashMovement',
        entityId: movementId,
        action: AuditAction.UPDATE,
        before: CashMovementMapper.toJSON(cashMovement),
        after: updated ? CashMovementMapper.toJSON(updated) : undefined,
      });
    }

    return ok;
  }
}
