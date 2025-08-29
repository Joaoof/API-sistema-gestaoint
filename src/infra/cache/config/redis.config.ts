import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL ?? '', {
    tls: {},
    maxRetriesPerRequest: null, // 🔑 evita esse erro
    enableReadyCheck: false,    // 🔑 opcional, acelera conexão
    retryStrategy(times) {
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
