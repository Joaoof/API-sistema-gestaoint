// src/core/exceptions/DatabaseError.ts
import { BaseError } from './base.exception';

export class DatabaseError extends BaseError {
    constructor(message: string, statusCode: number = 500) {
        super(message, statusCode);
        this.name = 'DatabaseError';
    }

    // Exemplo de subclasse específica:
    static createFromPrismaError(error: any): DatabaseError {
        const message = error.message || 'Database operation failed';
        return new DatabaseError(message, 500);
    }
}