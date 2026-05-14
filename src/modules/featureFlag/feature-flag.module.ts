import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RedisModule } from '../../infra/cache/redis.module';
import {
  FeatureFlagAdminResolver,
  MyFeaturesResolver,
} from './feature-flag.resolver';
import { RequiresModuleGuard } from './guards/requires-module.guard';
import { BusinessTemplateService } from './use-cases/business-template.service';
import { CompanyModuleToggleService } from './use-cases/company-module-toggle.service';
import { FeatureFlagService } from './use-cases/feature-flag.service';
import { ModuleConfigService } from './use-cases/module-config.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    FeatureFlagService,
    CompanyModuleToggleService,
    ModuleConfigService,
    BusinessTemplateService,
    RequiresModuleGuard,
    MyFeaturesResolver,
    FeatureFlagAdminResolver,
  ],
  exports: [FeatureFlagService, ModuleConfigService, RequiresModuleGuard],
})
export class FeatureFlagModule {}
