# Gestão de Vendas (GraphQL)

## Organização da solução

- `src/modules/sales/sales.module.ts`: composição de dependências (resolvers, use cases, serviços e repositories).
- `src/infra/graphql/resolvers/sales.resolver.ts`: resolvers GraphQL enxutos.
- `src/infra/graphql/dto/sales/*`: types e inputs GraphQL.
- `src/core/use-cases/sales/*`: regras de aplicação (cadastro/listagem/registro de venda).
- `src/core/services/commission/*`: políticas de comissão e pontuação via interfaces.
- `src/core/ports/sales/*`: contratos para persistência e configuração.
- `src/infra/database/implementations/sales/*`: implementações Prisma dos contratos.

## Regra de comissão (configurável no backend)

A configuração persistida em `CommissionRuleConfig` suporta:

- `commissionType = PERCENTAGE` com `commissionValue = 5` (ex.: 5%)
- `commissionType = FIXED_PER_SALE` com `commissionValue = 20` (R$20 por venda)
- `pointsPerCurrencyUnit` para controle de pontuação.

### Exemplo: configurar comissão via mutation

```graphql
mutation {
  updateCommissionConfiguration(
    input: {
      commissionType: PERCENTAGE
      commissionValue: 7.5
      pointsPerCurrencyUnit: 1.2
    }
  ) {
    commissionType
    commissionValue
    pointsPerCurrencyUnit
  }
}
```

## Como trocar a regra com baixo impacto

Hoje o módulo usa o provider:

- `CommissionCalculator -> PercentageCommissionCalculator`

Para trocar por regra progressiva futura:

1. Criar nova classe implementando `CommissionCalculator`.
2. Trocar no `SalesModule` o provider `CommissionCalculator`.
3. Manter resolvers/use cases inalterados.

## Fluxo completo

1. Cadastrar vendedor (`createSeller`).
2. Cadastrar produto (`createSalesProduct`).
3. Registrar venda (`registerSale`) informando vendedor e itens.
4. O `RegisterSaleUseCase` calcula total, aplica comissão/pontos via `CommissionPolicyService`, grava a venda e atualiza acumulados do vendedor.
5. Consultar dados em `sales`, `sellers`, `salesProducts` e `commissionConfiguration`.
