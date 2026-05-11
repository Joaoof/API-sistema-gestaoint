import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
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
  constructor(
    private readonly useCases: CategoryUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => CategoryListEntity)
  async categories(
    @CurrentUser() user: AuthUser,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @Args('filters', { nullable: true }) filters?: CategoryFiltersInput,
  ): Promise<CategoryListEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, pagination, filters);
  }

  @Query(() => [CategoryEntity])
  async activeCategories(@CurrentUser() user: AuthUser): Promise<CategoryEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listActive(companyId);
  }

  @Query(() => CategoryEntity)
  async category(
    @CurrentUser() user: AuthUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CategoryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => CategoryEntity)
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateCategoryInput,
  ): Promise<CategoryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => CategoryEntity)
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<CategoryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => DeleteCategoryResult)
  async deleteCategory(
    @CurrentUser() user: AuthUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<DeleteCategoryResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.delete({ userId: user.id!, companyId }, id);
  }

  @Mutation(() => CategoryEntity)
  async toggleCategoryStatus(
    @CurrentUser() user: AuthUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CategoryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.toggleStatus({ userId: user.id!, companyId }, id);
  }
}
