import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CompanyFiscalConfigResolver } from './company-fiscal-config.resolver';
import { CompanyFiscalConfigUseCases } from './use-cases/company-fiscal-config.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [CompanyFiscalConfigResolver, CompanyFiscalConfigUseCases],
  exports: [CompanyFiscalConfigUseCases],
})
export class CompanyFiscalConfigModule {}
