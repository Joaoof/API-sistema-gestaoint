import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error(
    'REDIS_URL não está definida! Verifique as variáveis de ambiente.',
  );
}

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Evita falhas em pipelines
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 50, 30000); // Reconecta até 30s
  },
});

redis.on('error', (err) => {
  console.error('🔴 Redis Connection Error:', err.message || err.toString());
});

redis.on('connect', () => {
  console.log('🔗 Conectando ao Redis...');
});

redis.on('ready', () => {
  console.log('✅ Redis pronto para uso!');
});

export default redis;
