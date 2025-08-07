// src/modules/entry-movement/use-cases/create-entry-movement.use-case.ts
import { Inject } from '@nestjs/common';
import { EntryTypeClient as PrismaEntryTypeClient } from '@prisma/client';
import { EntryMovement } from 'src/core/entities/entry-movement.entity';
import { EntryMovementRepository } from 'src/core/ports/entry-movement.repository';
import { CreateEntryMovementDto } from 'src/modules/entryMovement/dtos/create-entry-movement.dto';
import { EntryMovementMapper } from 'src/modules/entryMovement/mappers/entry-movement.mapper';

export class CreateEntryMovementUseCase {
    constructor(
        @Inject('EntryMovementRepository')
        private readonly entryMovementRepository: EntryMovementRepository,
    ) { }

    async execute(dto: CreateEntryMovementDto, userId: string): Promise<EntryMovement> {
        const entryMovement = EntryMovementMapper.toDomain(dto, userId);
        console.log("🧪 entryMovement gerado:", entryMovement);

        await this.entryMovementRepository.create(entryMovement);
        return entryMovement;
    }
}