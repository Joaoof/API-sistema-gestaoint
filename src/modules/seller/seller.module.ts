import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SellerResolver } from './seller.resolver';
import { SellerUseCases } from './use-cases/seller.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [SellerResolver, SellerUseCases],
  exports: [SellerUseCases],
})
export class SellerModule {}
