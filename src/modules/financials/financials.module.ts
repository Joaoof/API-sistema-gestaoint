import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { FinancialsResolver } from './financials.resolver';
import { FinancialsService } from './use-cases/financials.service';

@Module({
  imports: [PrismaModule],
  providers: [FinancialsService, FinancialsResolver],
  exports: [FinancialsService],
})
export class FinancialsModule {}
