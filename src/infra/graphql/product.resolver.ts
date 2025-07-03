import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CreateProductUseCase } from 'src/core/use-cases/product/create-product.use-case';
import { Product } from '../../core/entities/product.entity';
import { Injectable } from '@nestjs/common';

@Resolver(() => Product)
@Injectable()
export class ProductResolver {
  constructor(private readonly createProductUseCase: CreateProductUseCase) { }

  @Query(() => [Product])
  async products() {
    // Para listar, precisaria implementar use case de listar, aqui só exemplo simples
    throw new Error('Implementar findAll use case');
  }

  @Mutation(() => Product)
  async createProduct(
    @Args('name') nameProduct: string,
    @Args('category') categoryName: string,
    @Args('quantity') quantity: number,
    @Args('costPrice') costPrice: number,
    @Args('salePrice') salePrice: number,
    @Args('supplier', { nullable: true }) supplierName?: string,
    @Args('description', { nullable: true }) description?: string,
  ) {
    return this.createProductUseCase.execute({
      nameProduct: nameProduct,
      categoryName,
      quantity,
      costPrice,
      salePrice,
      supplierName: supplierName ?? undefined,
      description: description || undefined,
    });
  }
}
