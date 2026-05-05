import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EvolutionApiClient } from './use-cases/evolution-api.client';
import { WhatsappSessionService } from './use-cases/whatsapp-session.service';
import { WhatsappSessionResolver } from './whatsapp-session.resolver';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WhatsappWebhookController],
  providers: [EvolutionApiClient, WhatsappSessionService, WhatsappSessionResolver],
  exports: [WhatsappSessionService],
})
export class WhatsappSessionModule {}
