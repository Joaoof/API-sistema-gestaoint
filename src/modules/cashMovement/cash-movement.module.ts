import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { CreateCashMovementUseCase } from 'src/core/use-cases/entryMovement/create-cash-movement.use-case';
import { FindAllCashMovementUseCase } from 'src/core/use-cases/entryMovement/find-all-cash-movement.use-case';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaCashMovementRepository } from 'src/infra/database/implementations/cashMovement/cash-movement.prisma.repository';
import { CashMovementResolver } from 'src/infra/graphql/resolvers/cash-movement.resolver';

@Module({
    imports: [
        PrismaModule,
        RedisModule
    ],
    providers: [
        CreateCashMovementUseCase, CashMovementResolver, FindAllCashMovementUseCase,
        {
            provide: 'CashMovementRepository',
            useClass: PrismaCashMovementRepository,
        },
    ],
    exports: [CreateCashMovementUseCase, FindAllCashMovementUseCase]
})
export class CashMovementModule { }
