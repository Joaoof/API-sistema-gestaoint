/* eslint-disable no-unused-vars */

import { FindAllCashMovementInput } from '../use-cases/cashMovement/dtos/find-all-cash-movement.input';
import { CashMovement } from '../entities/movements/cash-movement.entity';
import { UpdateCashMovementInput } from '../use-cases/cashMovement/dtos/update-cash-movement.input';
import { MovementCategory } from '@prisma/client';

export interface CashMovementSummary {
  totalCount: number;
  totalEntries: number;
  totalExits: number;
  balance: number;
  pendingTotal: number;
  overdueTotal: number;
  byCategory: Array<{
    category: MovementCategory;
    total: number;
    count: number;
  }>;
}

export interface PaginatedCashMovements {
  items: CashMovement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: CashMovementSummary;
}

export interface CashMovementRepository {
  create(movement: CashMovement): Promise<void>;
  findById(id: string): Promise<CashMovement | null>;
  findAll(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<CashMovement[]>;
  findPaginated(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<PaginatedCashMovements>;
  updateMovement(
    movimentId: string,
    movement: UpdateCashMovementInput,
  ): Promise<boolean>;
  dashboardMovement(userId: string, date?: string): Promise<any>;
  deleteCashMovement(userId: string, movementId: string): Promise<boolean>;
}
