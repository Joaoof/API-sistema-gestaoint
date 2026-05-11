import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ReconciliationResolver } from './reconciliation.resolver';
import { ReconciliationService } from './use-cases/reconciliation.service';

@Module({
  imports: [PrismaModule],
  providers: [ReconciliationService, ReconciliationResolver],
})
export class ReconciliationModule {}
