import { Module } from '@nestjs/common';
import { CentroCustoModule } from './centroCusto/centro-custo.module';
import { ObraModule } from './obra/obra.module';
import { OrcamentoModule } from './orcamento/orcamento.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { ConstructionSharedModule } from './shared/construction-shared.module';
import { TransacaoModule } from './transacao/transacao.module';

@Module({
  imports: [
    ConstructionSharedModule,
    ObraModule,
    CentroCustoModule,
    OrcamentoModule,
    TransacaoModule,
    RelatoriosModule,
  ],
})
export class ConstructionModule {}
