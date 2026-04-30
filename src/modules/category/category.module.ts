import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CategoryResolver } from './category.resolver';
import { CategoryUseCases } from './use-cases/category.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [CategoryResolver, CategoryUseCases],
  exports: [CategoryUseCases],
})
export class CategoryModule {}
