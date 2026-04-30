import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Float,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { DeliveryStatus } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CreateDeliveryInput, UpdateDeliveryInput } from './dto/delivery.input';
import { DeliveryEntity } from './entities/delivery.entity';
import { DeliveryUseCases } from './use-cases/delivery.use-cases';

@ObjectType()
export class DeliverableOrder {
  @Field(() => ID) id!: string;
  @Field(() => Int) number!: number;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => Float) total!: number;
  @Field() createdAt!: Date;
}

@ObjectType()
export class DeliverySummary {
  @Field(() => Int) pending!: number;
  @Field(() => Int) inTransit!: number;
  @Field(() => Int) delivered!: number;
  @Field(() => Int) canceled!: number;
  @Field(() => Int) todayDelivered!: number;
}

@Resolver(() => DeliveryEntity)
@UseGuards(GqlAuthGuard)
export class DeliveryResolver {
  constructor(private readonly useCases: DeliveryUseCases) {}

  @Query(() => [DeliveryEntity])
  async deliveries(
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => DeliveryStatus, nullable: true }) status?: DeliveryStatus,
  ): Promise<DeliveryEntity[]> {
    return this.useCases.list({ search, status });
  }

  @Query(() => DeliveryEntity)
  async delivery(@Args('id') id: string): Promise<DeliveryEntity> {
    return this.useCases.findById(id);
  }

  @Query(() => [DeliverableOrder])
  async deliverableOrders(): Promise<DeliverableOrder[]> {
    return this.useCases.deliverableOrders();
  }

  @Query(() => DeliverySummary)
  async deliveriesSummary(): Promise<DeliverySummary> {
    return this.useCases.summary();
  }

  @Mutation(() => DeliveryEntity)
  async createDelivery(
    @Args('input') input: CreateDeliveryInput,
  ): Promise<DeliveryEntity> {
    return this.useCases.create(input);
  }

  @Mutation(() => DeliveryEntity)
  async updateDelivery(
    @Args('input') input: UpdateDeliveryInput,
  ): Promise<DeliveryEntity> {
    return this.useCases.update(input);
  }

  @Mutation(() => DeliveryEntity)
  async completeDelivery(
    @Args('id') id: string,
    @Args('notes', { nullable: true }) notes?: string,
  ): Promise<DeliveryEntity> {
    return this.useCases.complete(id, notes);
  }

  @Mutation(() => DeliveryEntity)
  async cancelDelivery(@Args('id') id: string): Promise<DeliveryEntity> {
    return this.useCases.cancel(id);
  }
}
