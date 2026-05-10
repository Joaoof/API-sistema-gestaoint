/**
 * Promove (ou rebaixa) um usuário a super-admin.
 *
 * Uso:
 *   npm run promote-superadmin -- email@x.com
 *   npm run promote-superadmin -- email@x.com --revoke
 *
 * Requer DATABASE_URL configurada (mesma que o servidor usa).
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'));
  const revoke = args.includes('--revoke');

  if (!email) {
    console.error('Uso: npm run promote-superadmin -- email@x.com [--revoke]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      console.error(`Usuário não encontrado: ${email}`);
      process.exit(1);
    }

    const updated = await prisma.users.update({
      where: { email },
      data: { isSuperAdmin: !revoke } as any,
    });

    console.log(
      revoke
        ? `Removido super-admin de ${updated.email} (id=${updated.id}).`
        : `${updated.email} agora é super-admin (id=${updated.id}).`,
    );
    console.log('Faça login novamente para o token refletir a mudança.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
