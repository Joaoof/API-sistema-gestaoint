import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import {
  CategoryFiltersInput,
  CreateCategoryInput,
  PaginationInput,
  UpdateCategoryInput,
} from './dto/category.input';
import {
  CategoryEntity,
  CategoryListEntity,
  DeleteCategoryResult,
} from './entities/category.entity';
import { CategoryUseCases } from './use-cases/category.use-cases';

@Resolver(() => CategoryEntity)
@UseGuards(GqlAuthGuard)
export class CategoryResolver {
  constructor(private readonly useCases: CategoryUseCases) {}

  @Query(() => CategoryListEntity)
  async categories(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @Args('filters', { nullable: true }) filters?: CategoryFiltersInput,
  ): Promise<CategoryListEntity> {
    return this.useCases.list(pagination, filters);
  }

  @Query(() => [CategoryEntity])
  async activeCategories(): Promise<CategoryEntity[]> {
    return this.useCases.listActive();
  }

  @Query(() => CategoryEntity)
  async category(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CategoryEntity> {
    return this.useCases.findById(id);
  }

  @Mutation(() => CategoryEntity)
  async createCategory(
    @Args('input') input: CreateCategoryInput,
  ): Promise<CategoryEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => CategoryEntity)
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<CategoryEntity> {
    return this.useCases.update(id, input);
  }

  @Mutation(() => DeleteCategoryResult)
  async deleteCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<DeleteCategoryResult> {
    return this.useCases.delete(id);
  }

  @Mutation(() => CategoryEntity)
  async toggleCategoryStatus(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CategoryEntity> {
    return this.useCases.toggleStatus(id);
  }
}
