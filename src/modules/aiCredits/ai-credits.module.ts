import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AiCreditsResolver } from './credits.resolver';
import { AiCreditsService } from './use-cases/credits.service';

@Module({
  imports: [PrismaModule],
  providers: [AiCreditsResolver, AiCreditsService],
  exports: [AiCreditsService],
})
export class AiCreditsModule {}
