import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Float,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateOrderInput } from './dto/create-order.input';
import { OrderEntity } from './entities/order.entity';
import { OrderUseCases } from './use-cases/order.use-cases';

interface AuthUser {
  id?: string;
  sub?: string;
}

@ObjectType()
export class OrderSummary {
  @Field(() => Int) todayCount!: number;
  @Field(() => Float) todayTotal!: number;
  @Field(() => Int) monthCount!: number;
  @Field(() => Float) monthTotal!: number;
}

@Resolver(() => OrderEntity)
@UseGuards(GqlAuthGuard)
export class OrderResolver {
  constructor(private readonly useCases: OrderUseCases) {}

  @Query(() => [OrderEntity])
  async orders(
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => OrderStatus, nullable: true }) status?: OrderStatus,
  ): Promise<OrderEntity[]> {
    return this.useCases.list({ search, status });
  }

  @Query(() => OrderEntity)
  async order(@Args('id') id: string): Promise<OrderEntity> {
    return this.useCases.findById(id);
  }

  @Query(() => OrderSummary)
  async ordersSummary(): Promise<OrderSummary> {
    return this.useCases.summary();
  }

  @Mutation(() => OrderEntity)
  async createOrder(
    @Args('input') input: CreateOrderInput,
    @CurrentUser() user: AuthUser,
  ): Promise<OrderEntity> {
    const userId = user?.id ?? user?.sub;
    return this.useCases.create(input, userId);
  }

  @Mutation(() => OrderEntity)
  async cancelOrder(@Args('id') id: string): Promise<OrderEntity> {
    return this.useCases.cancel(id);
  }
}
