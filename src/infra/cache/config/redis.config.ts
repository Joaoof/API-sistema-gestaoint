// src/config/redis.config.ts
import Redis from 'ioredis';

export const redisClient = new Redis({
    host: "redis://localhost:6379",
    password: "",
    tls: {}
});