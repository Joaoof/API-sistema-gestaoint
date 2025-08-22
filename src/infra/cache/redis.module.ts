// src/infra/cache/redis.module.ts
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            useValue: new Redis({
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT),
                password: process.env.REDIS_PASSWORD,
                tls: {}, // necessário para Upstash
            }),
        },
    ],
    exports: [REDIS_CLIENT], // ✅ Exporta o token
})
export class RedisModule { }