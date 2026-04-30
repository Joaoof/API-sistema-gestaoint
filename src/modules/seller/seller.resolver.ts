import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CreateSellerInput, UpdateSellerInput } from './dto/create-seller.input';
import { SellerEntity } from './entities/seller.entity';
import { SellerUseCases } from './use-cases/seller.use-cases';

@Resolver(() => SellerEntity)
@UseGuards(GqlAuthGuard)
export class SellerResolver {
  constructor(private readonly useCases: SellerUseCases) {}

  @Query(() => [SellerEntity])
  async sellers(
    @Args('search', { nullable: true }) search?: string,
    @Args('activeOnly', { nullable: true }) activeOnly?: boolean,
  ): Promise<SellerEntity[]> {
    return this.useCases.list({ search, activeOnly });
  }

  @Query(() => SellerEntity)
  async seller(@Args('id') id: string): Promise<SellerEntity> {
    return this.useCases.findById(id);
  }

  @Mutation(() => SellerEntity)
  async createSeller(@Args('input') input: CreateSellerInput): Promise<SellerEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => SellerEntity)
  async updateSeller(
    @Args('id') id: string,
    @Args('input') input: UpdateSellerInput,
  ): Promise<SellerEntity> {
    return this.useCases.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteSeller(@Args('id') id: string): Promise<boolean> {
    return this.useCases.remove(id);
  }
}
