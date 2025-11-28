import { TaxStatus } from "@prisma/client";
import { TaxExpense as TaxMovement } from "@prisma/client";
export class Tax {
    constructor(
        public readonly id: string,
        public supplier: string,
        public value: number,
        public description: string,
        public dueDate: Date,
        public status: TaxStatus,
        public readonly user_id: string,
    ) {
    }

    static fromPrisma(data: TaxMovement): Tax {
        return new Tax(
            data.id,
            data.supplier,
            Number(data.value),
            data.description,
            data.dueDate,
            data.status,
            data.user_id
        )
    }

    toJSON() {
        return {
            id: this.id,
            supplier: this.supplier,
            value: this.value,
            description: this.description,
            dueDate: this.dueDate,
            status: this.status
        }
    }
}