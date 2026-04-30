import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AccountPayableResolver } from './account-payable.resolver';
import { AccountPayableUseCases } from './use-cases/account-payable.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [AccountPayableResolver, AccountPayableUseCases],
  exports: [AccountPayableUseCases],
})
export class AccountPayableModule {}
