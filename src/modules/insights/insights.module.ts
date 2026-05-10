import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AiCreditsModule } from '../aiCredits/ai-credits.module';
import { ReportsModule } from '../reports/reports.module';
import { InsightsResolver } from './insights.resolver';
import { InsightsService } from './use-cases/insights.service';

@Module({
  imports: [PrismaModule, AiModule, AiCreditsModule, ReportsModule],
  providers: [InsightsService, InsightsResolver],
  exports: [InsightsService],
})
export class InsightsModule {}
