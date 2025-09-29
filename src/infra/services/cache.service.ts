import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager'; // tipo correto
import { CacheServicePort } from 'src/core/ports/cache.service';

@Injectable()
export class CacheServiceWrapper implements CacheServicePort {
  private readonly cacheManager: Cache;

  constructor(@Inject(CACHE_MANAGER) cacheManager: Cache) {
    this.cacheManager = cacheManager;
  }

  async get(key: string) {
    return this.cacheManager.get(key);
  }

  async set(key: string, value: any, ttl?: number) {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }
}
