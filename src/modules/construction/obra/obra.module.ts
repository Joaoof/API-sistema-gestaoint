import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { ObraResolver } from './obra.resolver';
import { ObraUseCases } from './use-cases/obra.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [ObraResolver, ObraUseCases],
  exports: [ObraUseCases],
})
export class ObraModule {}
