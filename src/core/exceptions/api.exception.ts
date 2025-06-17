// src/core/exceptions/ApiError.ts
import { BaseError } from './base.exception';

export class ApiError extends BaseError {
    constructor(message: string, statusCode: number = 400) {
        super(message, statusCode);
        this.name = 'ApiError';
    }
}

// Exemplos de subclasses específicas:
export class NotFoundError extends ApiError {
    constructor(resource: string, id: string | number) {
        super(`${resource} with ID ${id} not found`, 404);
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor() {
        super('Unauthorized', 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor() {
        super('Forbidden', 403);
        this.name = 'ForbiddenError';
    }
}