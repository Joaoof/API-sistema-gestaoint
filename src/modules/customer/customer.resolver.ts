import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerUseCases } from './use-cases/customer.use-cases';

@Resolver(() => CustomerEntity)
@UseGuards(GqlAuthGuard)
export class CustomerResolver {
  constructor(
    private readonly useCases: CustomerUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [CustomerEntity])
  async customers(
    @CurrentUser() user: AuthUser,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<CustomerEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, search);
  }

  @Query(() => CustomerEntity)
  async customer(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<CustomerEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => CustomerEntity)
  async createCustomer(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateCustomerInput,
  ): Promise<CustomerEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => CustomerEntity)
  async updateCustomer(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: CreateCustomerInput,
  ): Promise<CustomerEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }
}
