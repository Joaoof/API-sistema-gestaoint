import Redis from 'ioredis';

export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    tls: {},
    maxRetriesPerRequest: null, // 🔑 evita esse erro
    enableReadyCheck: false,    // 🔑 opcional, acelera conexão
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
