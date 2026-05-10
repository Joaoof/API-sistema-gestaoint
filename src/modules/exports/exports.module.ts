import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ExportsResolver } from './exports.resolver';
import { ExportsService } from './use-cases/exports.service';

@Module({
  imports: [PrismaModule],
  providers: [ExportsService, ExportsResolver],
})
export class ExportsModule {}
