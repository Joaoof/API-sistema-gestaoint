// infra/services/utils/cache.service.ts
import { Injectable } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Injectable()
export class CacheServiceWrapper {
    constructor(private cacheManager: CacheModule) { }

    async get(key: string): Promise<any> {
        return this.cacheManager.get(key);
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        await this.cacheManager.set(key, value, ttl);
    }

    async del(key: string): Promise<void> {
        await this.cacheManager.del(key);
    }
}