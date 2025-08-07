import { CashMovement } from "../entities/cash-movement.entity";

export interface CashMovementRepository {
    create(movement: CashMovement): Promise<void>
    findById(id: string): Promise<CashMovement | null>;
    findAll(): Promise<CashMovement[]>
}
