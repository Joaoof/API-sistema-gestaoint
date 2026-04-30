#!/usr/bin/env bash
# Fix-drift: resolve o drift entre migrations locais e o BD em Railway.
#
# Estratégia:
#   1. Gera o SQL que captura tudo que tá no BD mas não nas migrations locais
#      (Sale, Seller, SaleItem, SalesCatalogProduct, CommissionRuleConfig, CommissionRuleType)
#      + os DROPs das tables auth_login_view/mv_cash_movements_per_user que sumiram.
#   2. Coloca esse SQL DENTRO da pasta 20260401000000_add_sales_management/migration.sql
#   3. Desmarca como aplicada (rolled-back) → re-marca como aplicada
#      pra Prisma re-calcular o checksum e parar de reclamar.
#
# Idempotente: pode rodar mais de uma vez sem quebrar.

set -euo pipefail

cd "$(dirname "$0")/.."

# Carrega BANCO_URL do .env
export $(grep -v '^#' .env | grep BANCO_URL | xargs)

if [ -z "${BANCO_URL:-}" ]; then
  echo "❌ BANCO_URL não está no .env"
  exit 1
fi

MIG_DIR="prisma/migrations/20260401000000_add_sales_management"
MIG_FILE="$MIG_DIR/migration.sql"

mkdir -p "$MIG_DIR"

echo "🔍 Gerando SQL diff entre migrations locais e BD…"
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-url "$BANCO_URL" \
  --script > "$MIG_FILE"

echo "    → $MIG_FILE preenchido com $(wc -l < "$MIG_FILE") linhas"
echo

echo "📋 Conteúdo (primeiras 30 linhas):"
head -30 "$MIG_FILE"
echo "    ..."
echo

echo "🔄 Desmarcando migration como aplicada (pra Prisma recalcular checksum)…"
npx prisma migrate resolve --rolled-back 20260401000000_add_sales_management 2>/dev/null \
  || echo "    (já estava desmarcada ou ainda não havia sido marcada)"
echo

echo "✅ Re-marcando como aplicada com novo conteúdo…"
npx prisma migrate resolve --applied 20260401000000_add_sales_management
echo

echo "📊 Status final:"
npx prisma migrate status

echo
echo "✨ Se 'Database schema is up to date!' apareceu acima, pronto."
echo "   Se ainda houver drift, rode: cat $MIG_FILE"
echo "   pra inspecionar o SQL e ver se algo não-esperado aparece."
