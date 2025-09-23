import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';



@Injectable()
export class RedisService implements OnModuleDestroy {
    constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) { }

    onModuleDestroy(): void {
        this.redisClient.disconnect();
    }

    async get(key: string): Promise<string | null> {
        return this.redisClient.get(`${key}`);
    }


    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (ttlSeconds) {
            // ⚠️ Garanta que ttlSeconds é número
            await this.redisClient.set(key, stringValue, 'EX', Number(ttlSeconds));
        } else {
            await this.redisClient.set(key, stringValue);
        }
    }


    async delete(key: string): Promise<void> {
        await this.redisClient.del(`:${key}`);
    }

    async setWithExpiry(prefix: string, key: string, value: string, expiry: number): Promise<void> {
        await this.redisClient.set(`${prefix}:${key}`, value, 'EX', expiry);
    }
}