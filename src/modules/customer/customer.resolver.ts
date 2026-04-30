import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerUseCases } from './use-cases/customer.use-cases';

@Resolver(() => CustomerEntity)
@UseGuards(GqlAuthGuard)
export class CustomerResolver {
  constructor(private readonly useCases: CustomerUseCases) {}

  @Query(() => [CustomerEntity])
  async customers(
    @Args('search', { nullable: true }) search?: string,
  ): Promise<CustomerEntity[]> {
    return this.useCases.list(search);
  }

  @Query(() => CustomerEntity)
  async customer(@Args('id') id: string): Promise<CustomerEntity> {
    return this.useCases.findById(id);
  }

  @Mutation(() => CustomerEntity)
  async createCustomer(
    @Args('input') input: CreateCustomerInput,
  ): Promise<CustomerEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => CustomerEntity)
  async updateCustomer(
    @Args('id') id: string,
    @Args('input') input: CreateCustomerInput,
  ): Promise<CustomerEntity> {
    return this.useCases.update(id, input);
  }
}
