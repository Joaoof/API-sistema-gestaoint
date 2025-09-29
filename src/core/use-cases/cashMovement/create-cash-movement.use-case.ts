import { CashMovementMapper } from '@modules/cashMovement/mappers/entry-movement.mapper';
import { BadRequestException, Inject } from '@nestjs/common';
import { CashMovementRepository } from '../../ports/cash-movement.repository';
import { CashMovement } from '../../entities/movements/cash-movement.entity';
import { CreateCashMovementDto, CreateCashMovementSchema } from 'src/modules/cashMovement/dtos/cash-movement.dto';

export class CreateCashMovementUseCase {
    constructor(
        @Inject('CashMovementRepository')
        private readonly cashMovementRepo: CashMovementRepository,
    ) { }

    async execute(dto: CreateCashMovementDto, userId: string): Promise<CashMovement> {

        if (!userId) {
            throw new BadRequestException('userId é obrigatório');
        }

        const validatedDto = CreateCashMovementSchema.parse({
            ...dto,
            userId: userId
        });

        const movement = CashMovementMapper.toDomain(validatedDto, userId);
        await this.cashMovementRepo.create(movement);
        return movement;
    }
}