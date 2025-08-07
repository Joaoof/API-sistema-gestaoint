import { Inject, Injectable } from "@nestjs/common";
import { EntryMovement } from "src/core/entities/entry-movement.entity";
import { EntryMovementRepository } from "src/core/ports/entry-movement.repository";


@Injectable()
export class FindByIdEntryMovementUseCase {
    constructor(@Inject('EntryMovementRepository') private readonly entryMovementRepository: EntryMovementRepository) { }

    async execute(id: string): Promise<EntryMovement> {
        const find = await this.entryMovementRepository.findById(id);
        if (!find) {
            throw new Error(`EntryMovement with id ${id} not found`);
        }
        return find;
    }
}