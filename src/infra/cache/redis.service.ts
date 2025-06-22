// src/infra/cache/redis.service.ts
import { Injectable } from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService {
    private client: RedisClient;

    constructor() {
        this.client = new Redis();
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async setex(key: string, ttl: number, value: string): Promise<void> {
        await this.client.setex(key, ttl, value);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }
}