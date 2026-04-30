# Recuperação não-destrutiva da migration

**NÃO** rode `prisma migrate reset` — apaga tudo.

## Diagnóstico

- A migration `20260401000000_add_sales_management` foi aplicada no banco mas não está no seu repo local (provavelmente outro ambiente/dev aplicou)
- Existem materialized views (`auth_login_view`, `mv_cash_movements_per_user`) criadas pelo cron em `main.ts` — Prisma não sabe delas e isso é OK
- Você precisa adicionar `ProductImage` + campos novos em `Product` sem perder dados

## Plano

```
[1] Gerar SQL apenas das mudanças NOVAS (ProductImage + Product fields)
[2] Aplicar esse SQL no banco manualmente (não via migrate dev)
[3] Criar a pasta da migration faltante (sales) marcando como aplicada
[4] Criar a pasta da nova migration (product images) marcando como aplicada
[5] Daí pra frente, migrações novas funcionam normal
```

## Passo 1 — Gerar SQL apenas das mudanças novas

```bash
cd ~/API-sistema-gestaoint

# Carrega BANCO_URL do .env e gera SQL diff
export $(grep -v '^#' .env | xargs)

npx prisma migrate diff \
  --from-url "$BANCO_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/new-product-changes.sql

# Inspecione antes de aplicar:
cat /tmp/new-product-changes.sql
```

O conteúdo deve ser parecido com:
```sql
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "sku" TEXT,
                     ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 0,
                     ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'UN',
                     ADD COLUMN "weight" DECIMAL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductImage_key_key" ON "ProductImage"("key");
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");
CREATE INDEX "ProductImage_productId_order_idx" ON "ProductImage"("productId", "order");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Se o diff tentar criar `Sale`/`Seller`/etc, **comente aquelas linhas no arquivo** — isso já está no banco.

## Passo 2 — Aplicar o SQL diretamente no banco

```bash
# Aplica via psql (precisa do client postgres instalado)
psql "$BANCO_URL" -f /tmp/new-product-changes.sql

# Ou via Prisma db execute (não precisa do psql):
npx prisma db execute --file /tmp/new-product-changes.sql --schema prisma/schema.prisma
```

## Passo 3 — Marcar a migration faltante (sales) como aplicada

```bash
# Cria a pasta da migration que já está em prod mas não no seu repo
mkdir -p prisma/migrations/20260401000000_add_sales_management

# Pega o SQL real da migration (ela já está aplicada — você só precisa registrar)
# Como você não tem o SQL original, gere uma representação pelo diff entre
# a migration anterior e o estado atual do banco PARA AS TABELAS DE SALES:
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-url "$BANCO_URL" \
  --script > prisma/migrations/20260401000000_add_sales_management/migration.sql

# Edite o arquivo gerado: deixe APENAS o CREATE de Sale/SaleItem/Seller/SalesCatalogProduct/CommissionRuleConfig + enums.
# Remova do arquivo qualquer ALTER em Product ou ProductImage (esses são da próxima migration).

# Marca como aplicado (Prisma só anota no _prisma_migrations, não roda)
npx prisma migrate resolve --applied 20260401000000_add_sales_management
```

## Passo 4 — Registrar a nova migration de imagens

```bash
mkdir -p prisma/migrations/20260430120000_add_product_images
cp /tmp/new-product-changes.sql prisma/migrations/20260430120000_add_product_images/migration.sql

# Marca como aplicado (Prisma vê o SQL no diretório, sabe que já foi rodado)
npx prisma migrate resolve --applied 20260430120000_add_product_images
```

## Passo 5 — Validar

```bash
# Status deve mostrar tudo aplicado e sem drift
npx prisma migrate status

# Regenerar o client com os novos campos
npx prisma generate
```

Se aparecer **"Database schema is up to date!"** — ✅ pronto.

## Próximas migrations

A partir daqui você pode usar `npx prisma migrate dev --name xxxx` normalmente.

## Plano B — se algo travar

Em produção (Railway), a melhor prática é:
- Manter um arquivo `_init.sql` com snapshot do schema
- Toda mudança nova vai por SQL revisado, aplicado via `prisma db execute`
- `prisma migrate resolve --applied` para registrar no histórico

**Nunca rode `migrate dev` em banco de produção** — ele tenta aplicar/dropar baseado no histórico local, e isso pode derrubar dados.

Em CI, use `prisma migrate deploy` (não-interativo, só aplica pendentes).
