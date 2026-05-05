import { Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { CashMovementRepository } from '../../ports/cash-movement.repository';
import { AuditLogService } from '../../../modules/audit/use-cases/audit-log.service';
import { AuditActor } from '../../../modules/audit/types/actor';
import { CashMovementMapper } from '../../mappers/cash-movement.mapper';

@Injectable()
export class DeleteCashMovementUseCase {
  constructor(
    @Inject('CashMovementRepository')
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(actor: AuditActor, movementId: string): Promise<boolean> {
    const cashMovement = await this.cashMovementRepository.findById(movementId);

    if (!cashMovement) return false;

    if (cashMovement.user_id !== actor.userId) {
      throw new Error('Você não tem permissão para deletar este movimento.');
    }

    await this.cashMovementRepository.deleteCashMovement(
      actor.userId,
      movementId,
    );

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'CashMovement',
      entityId: movementId,
      action: AuditAction.DELETE,
      before: CashMovementMapper.toJSON(cashMovement),
    });

    return true;
  }
}
