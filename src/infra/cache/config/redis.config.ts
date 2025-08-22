import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_HOST ?? '');

redis.on('error', (err) => {
    console.error('🔴 Redis Connection Error:', err);
});

redis.on('ready', () => {
    console.log('✅ Redis pronto para uso!');
});

export default redis;
