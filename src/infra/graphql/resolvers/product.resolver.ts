import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Injectable, UseGuards } from '@nestjs/common';
import { CreateProductCommandHandler } from 'src/core/use-cases/product/create-product/create-product.handler';
import { FindAllProductsUseCase } from 'src/core/use-cases/product/find-all-products.use.case';
import { ProductResponseDto } from 'src/modules/product/dtos/response-product.dto';
import { ProductMapper } from 'src/modules/product/mapper/product.mapper';
import { CreateProductCommand } from 'src/core/use-cases/product/create-product/create-product.command';
import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { Users } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';

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
  supplierId: string;

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

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProductResponseDto)
  async createProduct(
    @Args('dto') input: CreateProductInput,
    @CurrentUser() user: Users
  ) {
    const command = new CreateProductCommand(input, user.id);
    const product = await this.createProductUseCase.execute(command);
    return ProductMapper.toJSON(product);
  }
}
