import { Inject, Injectable } from '@nestjs/common';
import { CashMovementRepository } from '../../ports/cash-movement.repository';

@Injectable()
export class DeleteCashMovementUseCase {
    constructor(
        @Inject('CashMovementRepository')
        private readonly cashMovementRepository: CashMovementRepository,
    ) { }

    async execute(userId: string, movementId: string): Promise<boolean> {
        const cashMovement = await this.cashMovementRepository.findById(movementId);

        if (!cashMovement) return false;

        if (cashMovement.user_id !== userId) {
            throw new Error('Você não tem permissão para deletar este movimento.');
        }

        await this.cashMovementRepository.deleteCashMovement(userId, movementId);

        return true;
    }
}
