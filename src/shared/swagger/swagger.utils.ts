// src/shared/utils/swagger.utils.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

interface RouteDefinition {
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    summary: string;
    body?: any;
    responses: Record<number, { description: string; type?: Type<any> | 'object' | 'array'; isArray?: boolean; example?: any }>;
}

export function createRoute(options: RouteDefinition) {
    const decorators: MethodDecorator[] = [];

    // Summary
    if (options.summary) {
        decorators.push(ApiOperation({ summary: options.summary }));
    }

    // Body
    if (options.body) {
        decorators.push(ApiBody({ type: options.body }));
    }

    // Responses
    for (const [status, response] of Object.entries(options.responses)) {
        const { description, type, isArray, example } = response;

        let modelType: Type<unknown> | undefined = undefined;
        if (type && typeof type === 'function') {
            modelType = type as Type<unknown>;
        }

        const options: any = { status: parseInt(status), description: description };
        if (modelType) options.type = modelType;
        if (example) options.example = example;

        if (isArray) {
            options.isArray = true;
        }

        decorators.push(ApiResponse(options));
    }

    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        applyDecorators(...decorators)(target, key, descriptor);
    };
}