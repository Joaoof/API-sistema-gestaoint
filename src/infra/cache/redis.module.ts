// src/config/redis.module.ts
import { Module } from '@nestjs/common';
import { RedisService } from 'src/infra/cache/redis.service';
import { REDIS_CLIENT } from './redis.constants';
import redis from './config/redis.config';

@Module({
    providers: [{
        provide: 'REDIS_CLIENT',
        useValue: redis
    },
        RedisService
    ],
    exports: [RedisService, 'REDIS_CLIENT'], // Exporta para usar em outros módulos
})
export class RedisModule { }