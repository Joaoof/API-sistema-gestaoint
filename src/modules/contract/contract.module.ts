import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ContractResolver } from './contract.resolver';
import { ContractUseCases } from './use-cases/contract.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [ContractResolver, ContractUseCases],
  exports: [ContractUseCases],
})
export class ContractModule {}
