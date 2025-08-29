// src/infra/cache/redis.module.ts
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    console.error('❌ REDIS_URL não está definida!');
    throw new Error('REDIS_URL is required');
}

// ✅ Instância do Redis com TLS e tratamento de erros
export const redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        return Math.min(times * 50, 30000);
    },
});

redisClient.on('error', (err) => {
    console.error('🔴 Redis Connection Error:', err.message || err.toString());
});

redisClient.on('connect', () => {
    console.log('🔗 Conectando ao Redis...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis conectado com sucesso!');
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