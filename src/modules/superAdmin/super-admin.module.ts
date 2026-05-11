import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminResolver } from './super-admin.resolver';
import { SuperAdminMetricsService } from './use-cases/super-admin-metrics.service';
import { SuperAdminCompaniesService } from './use-cases/super-admin-companies.service';
import { SuperAdminUsersService } from './use-cases/super-admin-users.service';
import { SuperAdminPlansService } from './use-cases/super-admin-plans.service';
import { SuperAdminAiService } from './use-cases/super-admin-ai.service';
import { SuperAdminWebhooksService } from './use-cases/super-admin-webhooks.service';
import { SuperAdminLogsService } from './use-cases/super-admin-logs.service';

@Module({
  imports: [PrismaModule],
  providers: [
    SuperAdminResolver,
    SuperAdminMetricsService,
    SuperAdminCompaniesService,
    SuperAdminUsersService,
    SuperAdminPlansService,
    SuperAdminAiService,
    SuperAdminWebhooksService,
    SuperAdminLogsService,
  ],
})
export class SuperAdminModule {}
