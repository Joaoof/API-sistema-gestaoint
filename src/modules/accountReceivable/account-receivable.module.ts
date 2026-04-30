import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AccountReceivableResolver } from './account-receivable.resolver';
import { AccountReceivableUseCases } from './use-cases/account-receivable.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [AccountReceivableResolver, AccountReceivableUseCases],
  exports: [AccountReceivableUseCases],
})
export class AccountReceivableModule {}
