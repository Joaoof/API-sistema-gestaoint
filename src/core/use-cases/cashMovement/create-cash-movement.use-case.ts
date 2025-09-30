import { CashMovementMapper } from '../../mappers/cash-movement.mapper';
import { BadRequestException, Inject } from '@nestjs/common';
import { CashMovementRepository } from '../../ports/cash-movement.repository';
import { CashMovement } from '../../entities/movements/cash-movement.entity';
import { CreateCashMovementSchema } from '../../dtos/create-cash-movement.core-dto';
import { CreateCashMovementDto } from '../../dtos/create-cash-movement.core-dto';

export class CreateCashMovementUseCase {
  private readonly cashMovementRepo: CashMovementRepository;
  constructor(
    @Inject('CashMovementRepository')
    cashMovementRepo: CashMovementRepository,
  ) {
    this.cashMovementRepo = cashMovementRepo;
  }

  async execute(
    dto: CreateCashMovementDto,
    userId: string,
  ): Promise<CashMovement> {
    if (!userId) {
      throw new BadRequestException('userId é obrigatório');
    }

    const validatedDto = CreateCashMovementSchema.parse({
      ...dto,
      userId: userId,
    });

    const movement = CashMovementMapper.toDomain(validatedDto, userId);
    await this.cashMovementRepo.create(movement);
    return movement;
  }
}
