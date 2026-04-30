import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { OrderResolver } from './order.resolver';
import { OrderUseCases } from './use-cases/order.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [OrderResolver, OrderUseCases],
  exports: [OrderUseCases],
})
export class OrderModule {}
