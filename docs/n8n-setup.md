# Integração n8n + Evolution → Relatórios via WhatsApp

## Como funciona

A API expõe três endpoints REST consumidos pelo n8n. O n8n busca o relatório,
formata e envia via Evolution para um número de WhatsApp.

| Endpoint                  | Quem chama                 | O que retorna                                    |
| ------------------------- | -------------------------- | ------------------------------------------------ |
| `GET /api/reports/daily`  | Schedule diário 18h        | Vendas, recebido, pago, formas de pagamento      |
| `GET /api/reports/weekly` | Schedule semanal segunda 8h | Resumo da semana + top clientes/produtos         |
| `GET /api/reports/alerts` | Schedule a cada 30min      | Boletos vencidos, contas vencendo, estoque baixo |

Todos exigem o header `X-API-Key` com o valor de `REPORTS_API_KEY`.

## Setup na API

No `.env` da API:

```env
REPORTS_API_KEY=<gere uma chave longa aleatória>
```

Reinicie a API. Para testar:

```bash
curl -H "X-API-Key: SUA_CHAVE" http://localhost:3000/api/reports/daily
```

## Setup no n8n

1. **Crie credencial "GestãoInt API Key"** (tipo Header Auth):
   - Name: `X-API-Key`
   - Value: o mesmo valor de `REPORTS_API_KEY`

2. **Defina variáveis de ambiente do n8n** (Settings → Environment Variables):
   - `GESTAOINT_API_URL` — ex: `https://api.suaempresa.com.br` (sem barra final)
   - `EVOLUTION_URL` — ex: `https://evolution.suaempresa.com.br`
   - `EVOLUTION_API_KEY` — apikey global do Evolution
   - `EVOLUTION_INSTANCE` — nome da instância (ex: `gestaoint`)
   - `RECIPIENT_PHONE` — número que recebe os relatórios em formato internacional sem `+` (ex: `5571999999999`)

3. **Importe o workflow** `docs/n8n-workflow-relatorios.json`.

4. **Configure o webhook do Evolution** para apontar pra:
   ```
   https://seu-n8n.com/webhook/evolution-inbound
   ```
   No painel do Evolution (Manager): aba Webhook → URL acima → eventos `messages.upsert`.

5. **Ative o workflow** clicando em "Active" no canto superior direito.

## Triggers do workflow

- **Diário 18h** (seg-sáb): `0 18 * * 1-6` — resumo do dia
- **Semanal seg 8h**: `0 8 * * 1` — resumo da semana passada
- **Alertas a cada 30min**: só envia se `hasAlerts=true`
- **Webhook inbound**: cliente manda "relatório" → responde com o resumo do dia

## Personalizar

- **Mudar horário do diário:** edite a expressão cron do node "Diário 18h"
- **Mudar destinatário:** mude `RECIPIENT_PHONE` (suporta múltiplos com vírgula se você adicionar um Split In Batches antes do envio)
- **Adicionar palavra-chave:** edite o node "Pediu relatório?" para procurar mais termos (ex: contém "vendas" → daily; contém "alerta" → alerts)
- **Trocar texto formatado:** o campo `text` retornado já vem pronto pra WhatsApp (com `*negrito*` e bullets). Pra customizar, use um node Set/Code antes do envio.
