import { Inject, Injectable, ExecutionContext } from '@nestjs/common';
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

  override trackBy(__context: ExecutionContext): string | undefined {
    const ctx = GqlExecutionContext.create(__context);

    // ⚡ segurança extra
    const info = ctx.getInfo();
    const args = ctx.getArgs();

    if (!info) {
      return undefined;
    }

    try {
      // Chave única por tipo + campo + args
      return `${info.parentType?.name}:${info.fieldName}:${JSON.stringify(args)}`;
    } catch (err) {
      console.warn('⚠️ Falha ao gerar chave de cache GraphQL:', err);
      return undefined;
    }
  }
}
