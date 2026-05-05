import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { FinancialAccountResolver } from './financial-account.resolver';
import { FinancialAccountUseCases } from './use-cases/financial-account.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [FinancialAccountResolver, FinancialAccountUseCases],
  exports: [FinancialAccountUseCases],
})
export class FinancialAccountModule {}
