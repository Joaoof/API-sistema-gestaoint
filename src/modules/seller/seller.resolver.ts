import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { CreateSellerInput, UpdateSellerInput } from './dto/create-seller.input';
import { SellerEntity } from './entities/seller.entity';
import { SellerUseCases } from './use-cases/seller.use-cases';

@Resolver(() => SellerEntity)
@UseGuards(GqlAuthGuard)
export class SellerResolver {
  constructor(
    private readonly useCases: SellerUseCases,
    private readonly tenancy: TenancyService,
  ) {}

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
  async createSeller(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateSellerInput,
  ): Promise<SellerEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => SellerEntity)
  async updateSeller(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateSellerInput,
  ): Promise<SellerEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => Boolean)
  async deleteSeller(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id!, companyId }, id);
  }
}
