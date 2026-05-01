import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { TransacaoResolver } from './transacao.resolver';
import { TransacaoUseCases } from './use-cases/transacao.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [TransacaoResolver, TransacaoUseCases],
  exports: [TransacaoUseCases],
})
export class TransacaoModule {}
