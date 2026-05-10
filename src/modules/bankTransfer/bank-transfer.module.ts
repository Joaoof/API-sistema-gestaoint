import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BankTransferResolver } from './bank-transfer.resolver';
import { BankTransferService } from './use-cases/bank-transfer.service';

@Module({
  imports: [PrismaModule],
  providers: [BankTransferService, BankTransferResolver],
})
export class BankTransferModule {}
