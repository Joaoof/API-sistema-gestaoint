import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DeliveryResolver } from './delivery.resolver';
import { DeliveryUseCases } from './use-cases/delivery.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [DeliveryResolver, DeliveryUseCases],
  exports: [DeliveryUseCases],
})
export class DeliveryModule {}
