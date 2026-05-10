import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RecurringBillResolver } from './recurring-bill.resolver';
import { RecurringBillService } from './use-cases/recurring-bill.service';

@Module({
  imports: [PrismaModule],
  providers: [RecurringBillService, RecurringBillResolver],
  exports: [RecurringBillService],
})
export class RecurringBillModule {}
