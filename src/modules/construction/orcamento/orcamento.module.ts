import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { OrcamentoResolver } from './orcamento.resolver';
import { OrcamentoUseCases } from './use-cases/orcamento.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [OrcamentoResolver, OrcamentoUseCases],
  exports: [OrcamentoUseCases],
})
export class OrcamentoModule {}
