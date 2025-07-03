import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';
import { CreateProductUseCase } from 'src/core/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { ProductResponseDto } from 'src/modules/product/dtos/response-product.dto';
import { ProductMapper } from 'src/modules/product/mapper/product.mapper';

@Resolver(() => ProductResponseDto)
@Injectable()
export class ProductResolver {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly findAllProductsUseCase: FindAllProductsUseCase
  ) { }

  @Query(() => [ProductResponseDto], { name: 'products' })
  async findAll() {
    const products = await this.findAllProductsUseCase.execute();
    return products.map(ProductMapper.toJSON);
  }

  @Mutation(() => ProductResponseDto, { name: 'createProduct' })
  async createProduct(
    @Args('nameProduct') nameProduct: string,
    @Args('categoryId') categoryId: string,
    @Args('quantity') quantity: number,
    @Args('costPrice') costPrice: number,
    @Args('salePrice') salePrice: number,
    @Args('supplierId', { nullable: true }) supplierId?: string,
    @Args('description', { nullable: true }) description?: string,
  ) {
    const product = await this.createProductUseCase.execute({
      nameProduct,
      quantity,
      costPrice,
      salePrice,
      categoryId,
      supplierId: supplierId ?? '',
      description,
    });

    return ProductMapper.toJSON(product);
  }
}
