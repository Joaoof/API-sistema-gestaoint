import { Inject } from '@nestjs/common';
import { CashMovement } from 'src/core/entities/cash-movement.entity';
import { CashMovementRepository } from 'src/core/ports/cash-movement.repository';
import { CreateCashMovementDto } from 'src/modules/cashMovement/dtos/cash-movement.dto';
import { CashMovementMapper } from 'src/modules/cashMovement/mappers/entry-movement.mapper';

export class CreateCashMovementUseCase {
    constructor(
        @Inject('CashMovementRepository')
        private readonly cashMovementRepo: CashMovementRepository,
    ) { }

    async execute(dto: CreateCashMovementDto, userId: string): Promise<CashMovement> {
        const movement = CashMovementMapper.toDomain(dto, userId);
        await this.cashMovementRepo.create(movement);
        return movement;
    }
}
