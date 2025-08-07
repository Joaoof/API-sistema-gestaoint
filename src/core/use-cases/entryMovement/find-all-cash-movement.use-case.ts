import { Inject, Injectable } from "@nestjs/common";
import { CashMovement } from "src/core/entities/cash-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";

@Injectable()
export class FindAllCashMovementUseCase {
    constructor(
        @Inject('CashMovementRepository')private readonly cashMovementRepository: CashMovementRepository
    ) { }

    async execute(): Promise<CashMovement[]> {
        return this.cashMovementRepository.findAll();
    }
}