import { Inject, Injectable } from "@nestjs/common";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";
import { UpdateCashMovementInput } from './dtos/update-cash-movement.input';

@Injectable()
export class UpdateCashMovementUseCase {
    constructor(
        @Inject('CashMovementRepository')
        private readonly cashMovementRepository: CashMovementRepository
    ) { }

    async execute(movementId: string, movement: UpdateCashMovementInput) {
        const cashMovement = await this.cashMovementRepository.findById(movementId);

        console.log('VEJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', cashMovement);


        if (!cashMovement) return false;

        await this.cashMovementRepository.updateMovement(movementId, movement);
        return true;
    }
}