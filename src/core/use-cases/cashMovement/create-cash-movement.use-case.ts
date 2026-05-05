import { CashMovementMapper } from '../../mappers/cash-movement.mapper';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { CashMovementRepository } from '../../ports/cash-movement.repository';
import { CashMovement } from '../../entities/movements/cash-movement.entity';
import { CreateCashMovementSchema } from '../../dtos/create-cash-movement.core-dto';
import { CreateCashMovementDto } from '../../dtos/create-cash-movement.core-dto';
import { AuditLogService } from '../../../modules/audit/use-cases/audit-log.service';
import { AuditActor } from '../../../modules/audit/types/actor';

@Injectable()
export class CreateCashMovementUseCase {
  constructor(
    @Inject('CashMovementRepository')
    private readonly cashMovementRepo: CashMovementRepository,
    private readonly audit: AuditLogService,
  ) {}

  async execute(
    actor: AuditActor,
    dto: CreateCashMovementDto,
  ): Promise<CashMovement> {
    if (!actor.userId) {
      throw new BadRequestException('userId é obrigatório');
    }

    const validatedDto = CreateCashMovementSchema.parse({
      ...dto,
      user_id: actor.userId,
    });

    const movement = CashMovementMapper.toDomain(validatedDto, actor.userId);
    await this.cashMovementRepo.create(movement);

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'CashMovement',
      entityId: movement.id,
      action: AuditAction.CREATE,
      after: CashMovementMapper.toJSON(movement),
    });

    return movement;
  }
}
