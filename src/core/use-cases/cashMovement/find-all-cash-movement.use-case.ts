import { Inject, Injectable } from '@nestjs/common';
import { CashMovement } from 'src/core/entities/movements/cash-movement.entity';
import { CashMovementRepository } from 'src/core/ports/cash-movement.repository';

import { FindAllCashMovementInput } from './dtos/find-all-cash-movement.input';

@Injectable()
export class FindAllCashMovementUseCase {
  private readonly cashMovementRepository: CashMovementRepository;
  constructor(
    @Inject('CashMovementRepository')
    cashMovementRepository: CashMovementRepository,
  ) {
    this.cashMovementRepository = cashMovementRepository;
  }

  async execute(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<CashMovement[]> {
    return this.cashMovementRepository.findAll(userId, filters);
  }
}
