import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ChatbotEvolutionModule } from '../chatbotEvolution/chatbot-evolution.module';
import { ConstructionModule } from '../construction/construction.module';
import { CalendarResolver } from './calendar.resolver';
import { PushResolver } from './push.resolver';
import { CalendarDispatcherService } from './use-cases/calendar-dispatcher.service';
import { CalendarService } from './use-cases/calendar.service';
import { WebPushService } from './use-cases/web-push.service';

@Module({
  imports: [PrismaModule, ConstructionModule, ChatbotEvolutionModule],
  providers: [
    CalendarService,
    CalendarResolver,
    PushResolver,
    WebPushService,
    CalendarDispatcherService,
  ],
  exports: [CalendarService, WebPushService],
})
export class CalendarModule {}
