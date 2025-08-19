import { FindAllCashMovementInput } from "src/infra/graphql/dto/find-all-cash-movement.input";
import { CashMovement } from "../entities/cash-movement.entity";
import { DashboardMovement } from "../entities/dashboard-movement.entity";

export interface CashMovementRepository {
    create(movement: CashMovement): Promise<void>
    findById(id: string): Promise<CashMovement | null>;
    findAll(userId: string, filters?: FindAllCashMovementInput): Promise<CashMovement[]>
    dashboardMovement(userId: string): Promise<any>
}
