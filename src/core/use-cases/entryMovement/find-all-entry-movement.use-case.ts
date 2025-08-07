import { Inject, Injectable } from "@nestjs/common";
import { EntryMovement } from "src/core/entities/entry-movement.entity";
import { EntryMovementRepository } from "src/core/ports/entry-movement.repository";

@Injectable()
export class FindAllEntryMovementUseCase {
    constructor(@Inject('EntryMovementRepository') private readonly entryMovementRepository: EntryMovementRepository) { }

    async execute(): Promise<EntryMovement[]> {
        const findAll = await this.entryMovementRepository.findAll();
        return findAll;
    }
}