#!/usr/bin/env bash
# Script de recuperação não-destrutiva da migration drift no Railway.
#
# O QUE FAZ:
#  1. Sincroniza prisma/schema.prisma com o estado real do banco (db pull)
#     puxando as tabelas Sale/Seller/SalesCatalogProduct/CommissionRuleConfig
#     que estavam só no DB.
#  2. Aplica manualmente o SQL que adiciona ProductImage + campos do Product
#     (idempotente, seguro de rodar múltiplas vezes).
#  3. Registra no histórico do Prisma (não roda — só anota) as duas migrations
#     "fantasma" (sales + product images) para que `migrate dev` futuro funcione.
#
# O QUE NÃO FAZ:
#  - Não dropa NADA. Não roda `migrate reset`.
#  - Não toca em auth_login_view nem mv_cash_movements_per_user
#    (são materialized views gerenciadas pelo cron em main.ts).

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env não encontrado. Copie de .env.example e preencha."
  exit 1
fi

# Carrega BANCO_URL
export $(grep -v '^#' .env | grep BANCO_URL | xargs)

if [ -z "${BANCO_URL:-}" ]; then
  echo "❌ BANCO_URL não definido no .env"
  exit 1
fi

echo "🔍 Banco: $(echo "$BANCO_URL" | sed -E 's|://[^@]+@|://***@|')"
echo

# ──────────────────────────────────────────────────────────────────
# 1. Backup do schema atual (vai ter as adições do Product/ProductImage)
# ──────────────────────────────────────────────────────────────────
echo "📦 [1/5] Fazendo backup do schema.prisma local…"
cp prisma/schema.prisma prisma/schema.prisma.backup
echo "    → prisma/schema.prisma.backup criado"
echo

# ──────────────────────────────────────────────────────────────────
# 2. Aplicar SQL manual (ProductImage + campos Product) — idempotente
# ──────────────────────────────────────────────────────────────────
echo "🗃️  [2/5] Aplicando ProductImage + campos novos no banco…"
npx prisma db execute \
  --file prisma/migrations/manual-add-product-images.sql \
  --schema prisma/schema.prisma
echo "    → ProductImage criada · Product.sku/minStock/unit/weight adicionados"
echo

# ──────────────────────────────────────────────────────────────────
# 3. Pull do banco para reconciliar schema com sales tables
# ──────────────────────────────────────────────────────────────────
echo "⬇️  [3/5] Sincronizando schema.prisma com tabelas reais do banco (db pull)…"
echo "    Isso vai trazer Sale/Seller/SalesCatalogProduct/CommissionRuleConfig"
echo "    que existem no DB mas não no seu schema local."
echo
read -rp "Continuar? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "    abortado pelo usuário."
  exit 0
fi
npx prisma db pull
echo "    → schema.prisma atualizado com tudo do banco"
echo

# ──────────────────────────────────────────────────────────────────
# 4. Registrar migrations fantasma no histórico
# ──────────────────────────────────────────────────────────────────
echo "📝 [4/5] Registrando migrations fantasma no _prisma_migrations…"

# 4a. Sales (já estava no banco antes)
SALES_DIR="prisma/migrations/20260401000000_add_sales_management"
if [ ! -d "$SALES_DIR" ]; then
  mkdir -p "$SALES_DIR"
  cat > "$SALES_DIR/migration.sql" <<'EOF'
-- Migration placeholder: tabelas Sale/Seller/SalesCatalogProduct/CommissionRuleConfig
-- já estavam aplicadas em produção. Este arquivo existe apenas para registrar
-- a migration no histórico do Prisma. Nenhum SQL é re-executado.
EOF
  echo "    → criada $SALES_DIR/"
fi
npx prisma migrate resolve --applied 20260401000000_add_sales_management 2>/dev/null \
  && echo "    → 20260401000000_add_sales_management marcada como aplicada" \
  || echo "    → já estava registrada"

# 4b. Product images (recém aplicada)
IMG_TIMESTAMP=$(date +%Y%m%d%H%M%S)
IMG_DIR="prisma/migrations/${IMG_TIMESTAMP}_add_product_images"
mkdir -p "$IMG_DIR"
cp prisma/migrations/manual-add-product-images.sql "$IMG_DIR/migration.sql"
npx prisma migrate resolve --applied "${IMG_TIMESTAMP}_add_product_images"
echo "    → ${IMG_TIMESTAMP}_add_product_images marcada como aplicada"
echo

# ──────────────────────────────────────────────────────────────────
# 5. Re-aplicar nossas adições no schema (perdidas no db pull)
# ──────────────────────────────────────────────────────────────────
echo "🔧 [5/5] db pull pode ter sobrescrito Product/ProductImage."
echo "    Verifique manualmente:"
echo "      diff prisma/schema.prisma.backup prisma/schema.prisma"
echo
echo "    Se sumiu o model ProductImage ou os campos sku/minStock/unit/weight,"
echo "    re-adicione copiando de prisma/schema.prisma.backup."
echo
echo "    Depois rode: npx prisma generate"
echo

# Status final
echo "📊 Status final do migrate:"
npx prisma migrate status || true

echo
echo "✅ Recuperação concluída."
echo "   Próximo passo: revisar o schema, rodar 'npx prisma generate' e iniciar o servidor."
