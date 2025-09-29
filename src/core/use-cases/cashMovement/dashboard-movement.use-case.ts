import { Inject, Injectable } from "@nestjs/common";
import { DashboardMovement } from "src/core/entities/dashboard-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";
import { DashboardMovementSchema } from "../dtos/dashboard-movement.core-dto";

@Injectable()
export class DashboardMovementUseCase {
    constructor(@Inject('CashMovementRepository') private readonly cashMovementRepository: CashMovementRepository) { }


    async execute(userId: string, date: string): Promise<DashboardMovement> {

        const dateInput = date === '' ? undefined : date;

        const { userId: validUserId, date: validDate } = DashboardMovementSchema.parse({
            userId,
            date: dateInput,
        });

        return this.cashMovementRepository.dashboardMovement(validUserId, validDate);
    }

}