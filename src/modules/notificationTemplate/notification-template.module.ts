import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationTemplateResolver } from './notification-template.resolver';
import { NotificationTemplateUseCases } from './use-cases/notification-template.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [NotificationTemplateResolver, NotificationTemplateUseCases],
  exports: [NotificationTemplateUseCases],
})
export class NotificationTemplateModule {}
