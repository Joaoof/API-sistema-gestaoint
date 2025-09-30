/* eslint-disable no-unused-vars */

import { FindAllCashMovementInput } from '../use-cases/cashMovement/dtos/find-all-cash-movement.input';
import { CashMovement } from '../entities/movements/cash-movement.entity';

export interface CashMovementRepository {
  create(movement: CashMovement): Promise<void>;
  findById(id: string): Promise<CashMovement | null>;
  findAll(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<CashMovement[]>;
  dashboardMovement(userId: string, date?: string): Promise<any>;
}
