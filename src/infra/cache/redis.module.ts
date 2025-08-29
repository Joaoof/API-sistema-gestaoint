// redis.module.ts
import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';

// Crie a instância
export const redisClient = new Redis(process.env.REDIS_URL ?? '', {
    tls: {}, // obrigatório para Upstash
});

@Module({
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useValue: redisClient,
        },
        RedisService,
    ],
    exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule { }