import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { FeatureFlagModule } from '../featureFlag/feature-flag.module';
import { ChatbotEvolutionResolver } from './chatbot-evolution.resolver';
import { ChatbotEvolutionWebhookController } from './chatbot-evolution.controller';
import { EvolutionChatbotEngineService } from './use-cases/evolution-chatbot-engine.service';
import { EvolutionTenantClient } from './use-cases/evolution-tenant.client';
import { SuperAdminEvolutionFlowsService } from './use-cases/super-admin-evolution-flows.service';
import { SuperAdminEvolutionService } from './use-cases/super-admin-evolution.service';

@Module({
  imports: [PrismaModule, FeatureFlagModule],
  controllers: [ChatbotEvolutionWebhookController],
  providers: [
    EvolutionTenantClient,
    EvolutionChatbotEngineService,
    SuperAdminEvolutionService,
    SuperAdminEvolutionFlowsService,
    ChatbotEvolutionResolver,
  ],
  exports: [EvolutionTenantClient, EvolutionChatbotEngineService],
})
export class ChatbotEvolutionModule {}
