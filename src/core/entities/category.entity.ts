// src/core/entities/category.entity.ts
import { CategoryStatus, Prisma } from "@prisma/client";

export class Category {
    constructor(
        public readonly id: string,
        public name: string,
        public description: string | null,
        public status: CategoryStatus,
        public readonly createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.id) {
            throw new Error('Category ID is required.');
        }

        if (!this.name || this.name.trim().length === 0) {
            throw new Error('Category name is required.');
        }

        if (!this.status) {
            throw new Error('Category status is required.');
        }

        if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
            throw new Error('Invalid createdAt date.');
        }

        if (!(this.updatedAt instanceof Date) || isNaN(this.updatedAt.getTime())) {
            throw new Error('Invalid updatedAt date.');
        }
    }

    update(name: string, description: string | null, status: CategoryStatus): void {
        this.name = name;
        this.description = description;
        this.status = status;
        this.updatedAt = new Date();

        this.validate();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    static fromPrisma(data: Prisma.CategoryGetPayload<{}>): Category {
        return new Category(
            data.id,
            data.name,
            data.description,
            data.status,
            data.createdAt,
            data.updatedAt
        );
    }
}