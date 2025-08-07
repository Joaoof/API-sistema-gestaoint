import { EntryMovement } from '../entities/entry-movement.entity';

export interface EntryMovementRepository {
    create(entryMovement: EntryMovement): Promise<void>
    findById(id: string): Promise<EntryMovement | null>;
    findAll(): Promise<EntryMovement[]>
    // outras operações...
}
