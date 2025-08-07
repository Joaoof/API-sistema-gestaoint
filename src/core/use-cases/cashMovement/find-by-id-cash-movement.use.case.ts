import { Inject, Injectable } from "@nestjs/common";
import { CashMovement } from "src/core/entities/cash-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";

@Injectable()
export class FindByIdCashMovementUseCase {
    constructor(@Inject('CashMovementRepository') private readonly cashMovementRepository: CashMovementRepository) { }

    async execute(id: string): Promise<CashMovement> {
        const find = await this.cashMovementRepository.findById(id);
        if (!find) {
            throw new Error(`CashMovement with id ${id} not found`);
        }
        return find;
    }
}