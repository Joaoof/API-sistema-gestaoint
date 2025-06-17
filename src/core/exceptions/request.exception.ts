// src/core/exceptions/RequestError.ts
import { BaseError } from './base.exception';

export class RequestError extends BaseError {
    constructor(message: string, statusCode: number = 400) {
        super(message, statusCode);
        this.name = 'RequestError';
    }

    // Exemplo de subclasse específica:
    static createInvalidParamError(paramName: string): RequestError {
        return new RequestError(`Invalid parameter: ${paramName}`, 400);
    }
}