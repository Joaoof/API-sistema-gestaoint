import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { RelatoriosResolver } from './relatorios.resolver';
import { RelatoriosUseCases } from './use-cases/relatorios.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [RelatoriosResolver, RelatoriosUseCases],
  exports: [RelatoriosUseCases],
})
export class RelatoriosModule {}
