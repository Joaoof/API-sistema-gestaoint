import { Inject, Injectable } from '@nestjs/common';
import {
  CashMovementRepository,
  PaginatedCashMovements,
} from '../../ports/cash-movement.repository';
import { FindAllCashMovementInput } from './dtos/find-all-cash-movement.input';

@Injectable()
export class FindPaginatedCashMovementUseCase {
  constructor(
    @Inject('CashMovementRepository')
    private readonly cashMovementRepository: CashMovementRepository,
  ) {}

  async execute(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<PaginatedCashMovements> {
    return this.cashMovementRepository.findPaginated(userId, filters);
  }
}
