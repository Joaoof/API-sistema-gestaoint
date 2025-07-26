import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';
import { CreateProductCommandHandler } from 'src/core/use-cases/product/create-product/create-product.handler';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { ProductResponseDto } from 'src/modules/product/dtos/response-product.dto';
import { ProductMapper } from 'src/modules/product/mapper/product.mapper';
import { CreateProductCommand } from 'src/core/use-cases/product/create-product/create-product.command';
import { InputType, Field, Float, Int } from '@nestjs/graphql';

@InputType()
export class CreateProductInput {
  @Field()
  nameProduct: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  costPrice: number;

  @Field(() => Float)
  salePrice: number;

  @Field()
  categoryId: string;

  @Field({ nullable: true })
  supplierId?: string;

  @Field({ nullable: true })
  description?: string;
}


@Resolver(() => ProductResponseDto)
@Injectable()
export class ProductResolver {
  constructor(
    private readonly createProductUseCase: CreateProductCommandHandler,
    private readonly findAllProductsUseCase: FindAllProductsUseCase
  ) { }

  @Query(() => [ProductResponseDto], { name: 'products' })
  async findAll() {
    const products = await this.findAllProductsUseCase.execute();
    return products.map(ProductMapper.toJSON);
  }

  @Mutation(() => ProductResponseDto, { name: 'createProduct' })
  async createProduct(
    @Args('dto') input: CreateProductInput
  ) {

    const dto = {
      nameProduct: input.nameProduct,
      quantity: input.quantity,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      categoryId: input.categoryId,
      supplierId: input.supplierId ?? '',
      description: input.description
    }

    const product = await this.   createProductUseCase.execute(new CreateProductCommand(dto));

    return product;
  }
}
