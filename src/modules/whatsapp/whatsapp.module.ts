import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationTemplateModule } from '../notificationTemplate/notification-template.module';
import { WhatsappResolver } from './whatsapp.resolver';
import { WhatsappService } from './use-cases/whatsapp.service';

@Module({
  imports: [PrismaModule, NotificationTemplateModule],
  providers: [WhatsappResolver, WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
