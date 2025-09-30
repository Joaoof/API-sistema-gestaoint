import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CreateCashMovementUseCase } from '../../core/use-cases/cashMovement/create-cash-movement.use-case';
import { DashboardMovementUseCase } from '../../core/use-cases/cashMovement/dashboard-movement.use-case';
import { FindAllCashMovementUseCase } from '../../core/use-cases/cashMovement/find-all-cash-movement.use-case';
import { RedisModule } from '../../infra/cache/redis.module';
import { PrismaCashMovementRepository } from '../../infra/database/implementations/cashMovement/cash-movement.prisma.repository';
import { CashMovementResolver } from '../../infra/graphql/resolvers/movements/cash-movement.resolver';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    CreateCashMovementUseCase,
    CashMovementResolver,
    FindAllCashMovementUseCase,
    DashboardMovementUseCase,
    {
      provide: 'CashMovementRepository',
      useClass: PrismaCashMovementRepository,
    },
  ],
  exports: [
    CreateCashMovementUseCase,
    FindAllCashMovementUseCase,
    DashboardMovementUseCase,
  ],
})
export class CashMovementModule {}
