import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentsResolver } from './payments.resolver';
import { PaymentsService } from './use-cases/payments.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentsService, PaymentsResolver],
  exports: [PaymentsService],
})
export class PaymentsModule {}
