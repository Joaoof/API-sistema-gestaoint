import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationResolver } from './notification.resolver';
import { NotificationUseCases } from './use-cases/notification.use-cases';
import { NotificationDispatcherService } from './use-cases/notification-dispatcher.service';
import { StubChannelAdapter } from './adapters/stub-channel.adapter';
import { NOTIFICATION_CHANNEL_PORT } from './ports/notification-channel.port';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    NotificationResolver,
    NotificationUseCases,
    NotificationDispatcherService,
    StubChannelAdapter,
    {
      provide: NOTIFICATION_CHANNEL_PORT,
      useExisting: StubChannelAdapter,
    },
  ],
  exports: [NotificationUseCases, NotificationDispatcherService],
})
export class NotificationModule {}
