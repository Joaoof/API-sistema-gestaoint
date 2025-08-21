// src/infra/cache/redis.service.ts
import { Injectable } from '@nestjs/common';
import redisClient from '../cache/config/redis.config';

@Injectable()
export class RedisService {
    async get(key: string): Promise<string | null> {
        return redisClient.get(key);
    }

    async setex(key: string, ttl: number, value: string): Promise<void> {
        await redisClient.setex(key, ttl, value);
    }

    async del(key: string): Promise<void> {
        await redisClient.del(key);
    }
}