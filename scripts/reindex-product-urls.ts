/**
 * Reindexa as URLs de imagens de produto no banco usando R2_PUBLIC_BASE atual.
 *
 * Use após:
 *   - Trocar o domínio público do R2 (cdn.dominio.com → outro)
 *   - Configurar R2_PUBLIC_BASE pela primeira vez (URLs antigas estavam quebradas)
 *
 * Como rodar:
 *   npx ts-node scripts/reindex-product-urls.ts
 *   ou: npm run reindex-product-urls
 *
 * O script lê o `key` salvo (que é estável) e regrava `url = R2_PUBLIC_BASE/key`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const publicBase =
    process.env.R2_PUBLIC_BASE && process.env.R2_PUBLIC_BASE.trim().length > 0
      ? process.env.R2_PUBLIC_BASE.replace(/\/$/, '')
      : `${endpoint}/${bucket}`;

  console.log(`📦 R2_PUBLIC_BASE em uso: ${publicBase}`);

  const images = await prisma.productImage.findMany({
    select: { id: true, key: true, url: true },
  });

  console.log(`🔍 ${images.length} imagens encontradas no banco`);

  let updated = 0;
  for (const img of images) {
    const expected = `${publicBase}/${img.key}`;
    if (img.url !== expected) {
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: expected },
      });
      updated++;
    }
  }

  console.log(`✅ ${updated} imagem(ns) atualizada(s)`);
  console.log(`   ${images.length - updated} já estavam corretas`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Falha ao reindexar:', err);
  process.exit(1);
});
