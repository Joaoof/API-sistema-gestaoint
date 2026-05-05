import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditResolver } from './audit.resolver';
import { AuditUseCases } from './use-cases/audit.use-cases';
import { AuditLogService } from './use-cases/audit-log.service';
import { AuditAccessService } from './use-cases/audit-access.service';
import { AuditAccessGuard } from './guards/audit-access.guard';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ||
            '1d') as StringValue,
        },
      }),
    }),
  ],
  providers: [
    AuditResolver,
    AuditUseCases,
    AuditLogService,
    AuditAccessService,
    AuditAccessGuard,
  ],
  exports: [AuditLogService, AuditUseCases, AuditAccessService],
})
export class AuditModule {}
