import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { AiResolver } from './ai.resolver';
import { AiChatService } from './use-cases/ai-chat.service';
import { AiToolsService } from './use-cases/ai-tools.service';
import { OpenAiClient } from './use-cases/openai.client';

@Module({
  imports: [PrismaModule, ReportsModule],
  providers: [AiResolver, AiChatService, AiToolsService, OpenAiClient],
})
export class AiModule {}
