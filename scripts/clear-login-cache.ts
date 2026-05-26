/**
 * Limpa o cache de login no Redis (chaves `login_view:*`).
 *
 * O login guarda os dados do usuário em `login_view:<email>` por 15 min.
 * Se um usuário virou super-admin (ou teve permissões alteradas) e o token
 * ainda sai "errado", esse cache pode estar segurando dados antigos.
 *
 * Uso:
 *   npm run clear-login-cache                 # apaga TODOS os login_view:*
 *   npm run clear-login-cache -- email@x.com  # apaga só o desse e-mail
 *
 * Requer REDIS_URL configurada (mesma que o servidor usa).
 */
import { Redis } from 'ioredis';

async function main() {
  const email = process.argv.slice(2).find((a) => !a.startsWith('--'));

  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('REDIS_URL não está definida no ambiente (.env).');
    process.exit(1);
  }

  const redis = new Redis(url, { maxRetriesPerRequest: 3 });
  try {
    if (email) {
      const key = `login_view:${email}`;
      const removed = await redis.del(key);
      console.log(
        removed > 0
          ? `Cache de login removido: ${key}`
          : `Nenhum cache encontrado para ${key} (já estava limpo).`,
      );
      return;
    }

    // Sem e-mail: varre e apaga todas as chaves login_view:* via SCAN
    // (SCAN não bloqueia o Redis como o KEYS faria).
    let cursor = '0';
    let total = 0;
    do {
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        'login_view:*',
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        total += await redis.del(...keys);
      }
    } while (cursor !== '0');

    console.log(`Cache de login limpo: ${total} chave(s) removida(s).`);
  } finally {
    redis.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
