import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';
import { CreateEntryMovementUseCase } from 'src/core/use-cases/entryMovement/create-entry-movement.use-case';
import { FindAllEntryMovementUseCase } from 'src/core/use-cases/entryMovement/find-all-entry-movement.use-case';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaEntryMovementRepository } from 'src/infra/database/implementations/entryMovement/entry-movement.prisma.repository';
import { EntryMovementResolver } from 'src/infra/graphql/resolvers/entry-movement.resolver';

@Module({
    imports: [
        PrismaModule,
        RedisModule
    ],
    providers: [
        CreateEntryMovementUseCase, EntryMovementResolver, FindAllEntryMovementUseCase,
        {
            provide: 'EntryMovementRepository',
            useClass: PrismaEntryMovementRepository,
        },
    ],
    exports: [CreateEntryMovementUseCase, FindAllEntryMovementUseCase]
})
export class EntryMovementModule { }
