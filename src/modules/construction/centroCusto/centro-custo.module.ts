import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { CentroCustoResolver } from './centro-custo.resolver';
import { CentroCustoUseCases } from './use-cases/centro-custo.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [CentroCustoResolver, CentroCustoUseCases],
  exports: [CentroCustoUseCases],
})
export class CentroCustoModule {}
