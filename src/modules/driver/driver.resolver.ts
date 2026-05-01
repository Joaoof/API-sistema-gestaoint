import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CreateDriverInput, UpdateDriverInput } from './dto/driver.input';
import { DriverEntity } from './entities/driver.entity';
import { DriverUseCases } from './use-cases/driver.use-cases';

@Resolver(() => DriverEntity)
@UseGuards(GqlAuthGuard)
export class DriverResolver {
  constructor(private readonly useCases: DriverUseCases) {}

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
  async createDriver(@Args('input') input: CreateDriverInput): Promise<DriverEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => DriverEntity)
  async updateDriver(
    @Args('id') id: string,
    @Args('input') input: UpdateDriverInput,
  ): Promise<DriverEntity> {
    return this.useCases.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteDriver(@Args('id') id: string): Promise<boolean> {
    return this.useCases.remove(id);
  }
}
