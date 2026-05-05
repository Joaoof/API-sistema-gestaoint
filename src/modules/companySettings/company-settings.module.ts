import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CompanySettingsResolver } from './company-settings.resolver';
import { CompanySettingsUseCases } from './use-cases/company-settings.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [CompanySettingsResolver, CompanySettingsUseCases],
  exports: [CompanySettingsUseCases],
})
export class CompanySettingsModule {}
