import { Inject, Injectable } from "@nestjs/common";
import { DashboardMovement } from "src/core/entities/dashboard-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";
import { DashboardMovementSchema } from '../../../modules/cashMovement/dtos/dashboard-movement.dto'

@Injectable()
export class DashboardMovementUseCase {
    constructor(@Inject('CashMovementRepository') private readonly cashMovementRepository: CashMovementRepository) { }


    async execute(userId: string, date: string): Promise<DashboardMovement> {
        const { userId: validUserId, date: validDate } = DashboardMovementSchema.parse({
            userId,
            date,
        });

        return this.cashMovementRepository.dashboardMovement(validUserId, validDate);
    }

}