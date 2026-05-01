import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AuditLogService } from './audit-log.service';
import { TenancyService } from './tenancy.service';
import './enums.gql';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, TenancyService],
  exports: [AuditLogService, TenancyService],
})
export class ConstructionSharedModule {}
