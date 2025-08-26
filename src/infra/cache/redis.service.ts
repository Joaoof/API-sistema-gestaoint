// src/infra/cache/redis.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis, // ✅ Correto
    ) { }
    
    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async setex(key: string, ttl: number, value: string): Promise<void> {
        await this.redis.setex(key, ttl, value);
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }
}