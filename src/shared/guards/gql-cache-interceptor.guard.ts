import {
    Inject,
    Injectable,
    ExecutionContext,
} from '@nestjs/common';
import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Cache } from 'cache-manager';

@Injectable()
export class GqlCacheInterceptor extends CacheInterceptor {
    constructor(
        @Inject(CACHE_MANAGER) cacheManager: Cache,
        reflector: Reflector,
    ) {
        super(cacheManager, reflector);
    }

    override trackBy(context: ExecutionContext): string | undefined {
        const ctx = GqlExecutionContext.create(context);
        const info = ctx.getInfo();
        const args = ctx.getArgs();

        // Chave única por tipo + campo + argumentos (ex: Query:getProducts:{"category":1})
        return `${info.parentType.name}:${info.fieldName}:${JSON.stringify(args)}`;
    }

    override isRequestCacheable(context: ExecutionContext): boolean {
        // Ignora método HTTP e permite cache para qualquer operação
        return true;
    }
}
