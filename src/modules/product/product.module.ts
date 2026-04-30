import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { R2Module } from '../../infra/services/r2/r2.module';
import { ProductResolver } from './product.resolver';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';

@Module({
  imports: [PrismaModule, R2Module],
  providers: [
    ProductResolver,
    CreateProductUseCase,
    ListProductsUseCase,
    DeleteProductUseCase,
    UpdateProductUseCase,
  ],
  exports: [
    CreateProductUseCase,
    ListProductsUseCase,
    DeleteProductUseCase,
    UpdateProductUseCase,
  ],
})
export class ProductModule {}
