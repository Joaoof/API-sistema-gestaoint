import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateProductInput } from './dto/create-product.input';
import { ProductEntity } from './entities/product.entity';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';

interface AuthUser {
  id?: string;
  sub?: string;
}

@Resolver(() => ProductEntity)
@UseGuards(GqlAuthGuard)
export class ProductResolver {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

  @Query(() => [ProductEntity])
  async products(
    @Args('search', { nullable: true }) search?: string,
    @Args('categoryId', { nullable: true }) categoryId?: string,
    @Args('status', { type: () => ProductStatus, nullable: true })
    status?: ProductStatus,
    @Args('take', { nullable: true, type: () => Number }) take?: number,
    @Args('skip', { nullable: true, type: () => Number }) skip?: number,
  ): Promise<ProductEntity[]> {
    return this.listProducts.execute({
      search,
      categoryId,
      status,
      take,
      skip,
    });
  }

  @Mutation(() => ProductEntity)
  async createProductMutation(
    @Args('input') input: CreateProductInput,
    @CurrentUser() user: AuthUser,
  ): Promise<ProductEntity> {
    const userId = user?.id ?? user?.sub;
    return this.createProduct.execute(input, userId);
  }

  @Mutation(() => Boolean)
  async deleteProductMutation(@Args('id') id: string): Promise<boolean> {
    return this.deleteProduct.execute(id);
  }
}
