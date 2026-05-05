import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WahaApiClient } from './use-cases/waha-api.client';
import { WhatsappChatbotService } from './use-cases/whatsapp-chatbot.service';
import { WhatsappPubSubService } from './use-cases/whatsapp-pubsub';
import { WhatsappReminderService } from './use-cases/whatsapp-reminder.service';
import { WhatsappSessionService } from './use-cases/whatsapp-session.service';
import { WhatsappSessionResolver } from './whatsapp-session.resolver';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WhatsappWebhookController],
  providers: [
    WahaApiClient,
    WhatsappSessionService,
    WhatsappSessionResolver,
    WhatsappPubSubService,
    WhatsappReminderService,
    WhatsappChatbotService,
  ],
  exports: [WhatsappSessionService, WhatsappPubSubService],
})
export class WhatsappSessionModule {}
