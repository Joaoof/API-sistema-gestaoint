import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        return Math.min(times * 50, 30000);
    },
    // 🔽 Adicione isto:
    keepAlive: 10000, // Envia pacote TCP a cada 10s para manter conexão
    connectTimeout: 10000, // Timeout de conexão
    // Opcional: se usar TLS
    // tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

redis.on('error', (err) => {
    console.error('🔴 Redis Connection Error:', err);
});

redis.on('ready', () => {
    console.log('✅ Redis pronto para uso!');
});

export default redis;
