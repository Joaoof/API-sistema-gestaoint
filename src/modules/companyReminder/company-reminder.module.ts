import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ConstructionModule } from '../construction/construction.module';
import { CompanyReminderResolver } from './company-reminder.resolver';
import { CompanyReminderService } from './use-cases/company-reminder.service';

@Module({
  imports: [PrismaModule, ConstructionModule],
  providers: [CompanyReminderService, CompanyReminderResolver],
  exports: [CompanyReminderService],
})
export class CompanyReminderModule {}
