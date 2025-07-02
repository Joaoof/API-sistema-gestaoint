// src/config/redis.module.ts
import { Module } from '@nestjs/common';
import { RedisService } from 'src/infra/cache/redis.service';

@Module({
    providers: [RedisService],
    exports: [RedisService], // Exporta para usar em outros módulos
})
export class RedisModule { }