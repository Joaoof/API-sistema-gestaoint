import { Inject, Injectable } from '@nestjs/common';
import { CashMovement } from '../../entities/movements/cash-movement.entity';
import { CashMovementRepository } from '../../ports/cash-movement.repository';

@Injectable()
export class FindByIdCashMovementUseCase {
  private readonly cashMovementRepository: CashMovementRepository;
  constructor(
    @Inject('CashMovementRepository')
    cashMovementRepository: CashMovementRepository,
  ) {
    this.cashMovementRepository = cashMovementRepository;
  }

  async execute(id: string): Promise<CashMovement> {
    const find = await this.cashMovementRepository.findById(id);
    if (!find) {
      throw new Error(`CashMovement with id ${id} not found`);
    }
    return find;
  }
}
