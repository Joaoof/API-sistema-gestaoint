import { EntryTypeClient } from "@prisma/client";

export class EntryMovement {
    constructor(
        public readonly id: string,
        public readonly user_id: string,
        public typeEntry: EntryTypeClient,
        public value: number,
        public description: string,
        public readonly createdAt: Date = new Date(),
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.id || this.id.trim().length === 0) {
            throw new Error('ID do lançamento é obrigatório.');
        }

        if (!this.user_id || this.user_id.trim().length === 0) {
            throw new Error('ID do usuário é obrigatório.');
        }

        if (!this.typeEntry || !Object.values(EntryTypeClient).includes(this.typeEntry)) {
            throw new Error('Tipo de entrada inválido.');
        }

        if (typeof this.value !== 'number' || this.value <= 0) {
            throw new Error('Valor deve ser um número positivo.');
        }

        if (!this.description || this.description.trim().length === 0) {
            throw new Error('Descrição é obrigatória.');
        }

        if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
            throw new Error('Data de criação inválida.');
        }
    }

    static fromPrisma(data: any): EntryMovement {
        return new EntryMovement(
            data.id,
            data.user_id,
            data.typeEntry,
            data.value,
            data.description,
            new Date(data.createdAt)
        );
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            typeEntry: this.typeEntry,
            value: this.value,
            description: this.description,
            createdAt: this.createdAt.toISOString()
        };
    }
}
