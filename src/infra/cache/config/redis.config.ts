// src/config/redis.config.ts
import Redis from 'ioredis';

export const redisClient = new Redis({
    host: "viable-ewe-10712.upstash.io",
    port: 6379,
    username: "default",
    password: "ASnYAAIjcDFjNzYxYzM0NTEwNmI0YjdkYjZjYmM5N2QxNWJjNWRjMHAxMA",
    tls: {}
});