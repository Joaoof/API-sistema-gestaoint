import { Inject, Injectable } from "@nestjs/common";
import { DashboardMovement } from "src/core/entities/dashboard-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";

@Injectable()
export class DashboardMovementUseCase {
    constructor(@Inject('CashMovementRepository') private readonly cashMovementRepository: CashMovementRepository) { }


    async execute(userId: string, date: string): Promise<DashboardMovement> {
        const search = await this.cashMovementRepository.dashboardMovement(userId, date)

        return search;
    }
}