import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BankIntegrationsResolver } from './bank-integrations.resolver';
import { WebhookProcessor } from './use-cases/webhook-processor.service';
import { BankWebhooksController } from './webhooks/bank-webhooks.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BankWebhooksController],
  providers: [WebhookProcessor, BankIntegrationsResolver],
  exports: [WebhookProcessor],
})
export class BankIntegrationsModule {}
