import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WahaApiClient } from './use-cases/waha-api.client';
import { WhatsappChatbotService } from './use-cases/whatsapp-chatbot.service';
import { WhatsappPubSubService } from './use-cases/whatsapp-pubsub';
import { WhatsappReminderService } from './use-cases/whatsapp-reminder.service';
import { WhatsappSessionService } from './use-cases/whatsapp-session.service';
import { WhatsappSessionResolver } from './whatsapp-session.resolver';

// Webhook de inbound foi removido — automações de WhatsApp agora vêm do n8n.
// Os providers Chatbot/Reminder seguem registrados pois o WhatsappSessionService
// os injeta, mas o agendador interno do reminder está desligado por padrão
// (use WHATSAPP_INTERNAL_REMINDERS=true para reativar).

@Module({
  imports: [PrismaModule, ConfigModule],
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
