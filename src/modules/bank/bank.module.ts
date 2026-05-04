import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BankResolver } from './bank.resolver';
import { BankUseCases } from './use-cases/bank.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [BankResolver, BankUseCases],
  exports: [BankUseCases],
})
export class BankModule {}
