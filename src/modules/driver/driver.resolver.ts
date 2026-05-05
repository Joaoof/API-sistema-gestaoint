import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { CreateDriverInput, UpdateDriverInput } from './dto/driver.input';
import { DriverEntity } from './entities/driver.entity';
import { DriverUseCases } from './use-cases/driver.use-cases';

@Resolver(() => DriverEntity)
@UseGuards(GqlAuthGuard)
export class DriverResolver {
  constructor(
    private readonly useCases: DriverUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [DriverEntity])
  async drivers(
    @Args('search', { nullable: true }) search?: string,
    @Args('activeOnly', { nullable: true }) activeOnly?: boolean,
  ): Promise<DriverEntity[]> {
    return this.useCases.list({ search, activeOnly });
  }

  @Query(() => DriverEntity)
  async driver(@Args('id') id: string): Promise<DriverEntity> {
    return this.useCases.findById(id);
  }

  @Mutation(() => DriverEntity)
  async createDriver(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateDriverInput,
  ): Promise<DriverEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => DriverEntity)
  async updateDriver(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateDriverInput,
  ): Promise<DriverEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => Boolean)
  async deleteDriver(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id!, companyId }, id);
  }
}
