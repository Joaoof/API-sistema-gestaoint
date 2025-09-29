import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { CreateCashMovementUseCase } from 'src/core/use-cases/cashMovement/create-cash-movement.use-case';
import { DashboardMovementUseCase } from 'src/core/use-cases/cashMovement/dashboard-movement.use-case';
import { FindAllCashMovementUseCase } from 'src/core/use-cases/cashMovement/find-all-cash-movement.use-case';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaCashMovementRepository } from 'src/infra/database/implementations/cashMovement/cash-movement.prisma.repository';
import { CashMovementResolver } from 'src/infra/graphql/resolvers/movements/cash-movement.resolver';

@Module({
    imports: [
        PrismaModule,
        RedisModule
    ],
    providers: [
        CreateCashMovementUseCase, CashMovementResolver, FindAllCashMovementUseCase, DashboardMovementUseCase,
        {
            provide: 'CashMovementRepository',
            useClass: PrismaCashMovementRepository,
        },
    ],
    exports: [CreateCashMovementUseCase, FindAllCashMovementUseCase, DashboardMovementUseCase]
})
export class CashMovementModule { }
