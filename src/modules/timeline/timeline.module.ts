import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ConstructionModule } from '../construction/construction.module';
import { TimelineResolver } from './timeline.resolver';
import { TimelineService } from './use-cases/timeline.service';

@Module({
  imports: [PrismaModule, ConstructionModule],
  providers: [TimelineService, TimelineResolver],
  exports: [TimelineService],
})
export class TimelineModule {}
