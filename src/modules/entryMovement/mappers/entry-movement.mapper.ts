import { EntryMovement } from 'src/core/entities/entry-movement.entity';
import { mapPrismaToDomainTypeEntry } from './enum/entry-type.mapper';
import { EntryTypeClient as PrismaEntryTypeClient } from '@prisma/client';
import { CreateEntryMovementDto } from '../dtos/create-entry-movement.dto';

export class EntryMovementMapper {
    static toDomain(dto: CreateEntryMovementDto, userId: string): EntryMovement {
        return new EntryMovement(
            crypto.randomUUID(),
            dto.user_id,
            dto.typeEntry,
            dto.value,
            dto.description,
        );
    }


    static toJSON(entryMovement: EntryMovement): any {
        return {
            id: entryMovement.id,
            user_id: entryMovement.user_id,
            typeEntry: mapPrismaToDomainTypeEntry(entryMovement.typeEntry as PrismaEntryTypeClient),
            value: entryMovement.value,
            description: entryMovement.description,
            createdAt: entryMovement.createdAt.toISOString(),
        };
    }

}