import { ExecutionContext, Injectable } from '@nestjs/common';
import {
    ThrottlerGuard,
    ThrottlerStorageService,
    ThrottlerException,
    ThrottlerRequest,
    ThrottlerModuleOptions
} from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FastifyReply } from 'fastify';
import { Reflector } from '@nestjs/core';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
    constructor(
        protected readonly options: ThrottlerModuleOptions,
        protected readonly storageService: ThrottlerStorageService,
        protected readonly reflector: Reflector,
    ) {
        super(options, storageService, reflector);
    }

    protected getRequest(context: ExecutionContext): any {
        const ctx = GqlExecutionContext.create(context);
        const gqlContext = ctx.getContext();
        return gqlContext.req;
    }

    protected getResponse(context: ExecutionContext): FastifyReply | undefined {
        const ctx = GqlExecutionContext.create(context);
        const gqlContext = ctx.getContext();
        return gqlContext.reply;
    }

    async handleRequest(request: ThrottlerRequest): Promise<boolean> {
        // pode adicionar lógica custom aqui se quiser
        return true;
    }

    async handleResponse(
        request: ThrottlerRequest,
        limit: number,
        ttl: number,
        hits: number,
    ): Promise<void> {
        const response = this.getResponse(request.context);
        if (!response || typeof response.header !== 'function') return;

        const remaining = Math.max(0, limit - hits);

        response.header('X-RateLimit-Limit', limit.toString());
        response.header('X-RateLimit-Remaining', remaining.toString());
        response.header('X-RateLimit-Reset', ttl.toString());
    }

    protected async throwThrottlingException(): Promise<void> {
        throw new ThrottlerException('Too many requests, slow down cowboy 🐎');
    }
}
