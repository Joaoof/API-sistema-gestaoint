import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CustomerResolver } from './customer.resolver';
import { CustomerUseCases } from './use-cases/customer.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [CustomerResolver, CustomerUseCases],
  exports: [CustomerUseCases],
})
export class CustomerModule {}
