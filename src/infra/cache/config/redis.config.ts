import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    retryStrategy(times) {
        // tenta reconectar exponencialmente, até 30s
        return Math.min(times * 50, 30000);
    },
});

redis.on('error', (err) => {
    console.error('🔴 Redis Connection Error:', err);
});

redis.on('ready', () => {
    console.log('✅ Redis pronto para uso!');
});

export default redis;
