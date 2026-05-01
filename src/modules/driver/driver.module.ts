import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DriverResolver } from './driver.resolver';
import { DriverUseCases } from './use-cases/driver.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [DriverResolver, DriverUseCases],
  exports: [DriverUseCases],
})
export class DriverModule {}
