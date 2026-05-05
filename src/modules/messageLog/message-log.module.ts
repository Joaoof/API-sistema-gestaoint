import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { MessageLogResolver } from './message-log.resolver';
import { MessageLogUseCases } from './use-cases/message-log.use-cases';
import { MessageWebhookController } from './message-webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MessageWebhookController],
  providers: [MessageLogResolver, MessageLogUseCases],
  exports: [MessageLogUseCases],
})
export class MessageLogModule {}
