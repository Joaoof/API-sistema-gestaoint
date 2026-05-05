import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductEntity } from './entities/product.entity';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { DeleteProductUseCase } from './use-cases/delete-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';

@Resolver(() => ProductEntity)
@UseGuards(GqlAuthGuard)
export class ProductResolver {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly tenancy: TenancyService,
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
    @CurrentUser() user: User,
    @Args('input') input: CreateProductInput,
  ): Promise<ProductEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.createProduct.execute({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async deleteProductMutation(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.deleteProduct.execute({ userId: user.id, companyId }, id);
  }

  @Mutation(() => ProductEntity)
  async updateProductMutation(
    @CurrentUser() user: User,
    @Args('input') input: UpdateProductInput,
  ): Promise<ProductEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.updateProduct.execute({ userId: user.id, companyId }, input);
  }

  @Query(() => ProductEntity, { nullable: true })
  async product(@Args('id') id: string): Promise<ProductEntity | null> {
    return this.listProducts.findById(id);
  }
}
