import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WahaApiClient } from './use-cases/waha-api.client';
import { WhatsappPubSubService } from './use-cases/whatsapp-pubsub';
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
  ],
  exports: [WhatsappSessionService, WhatsappPubSubService],
})
export class WhatsappSessionModule {}
