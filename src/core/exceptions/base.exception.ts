// src/core/exceptions/BaseError.ts
export class BaseError extends Error {
    constructor(public message: string, public statusCode: number = 500) {
        super(message);
        this.name = 'BaseError';
    }
}