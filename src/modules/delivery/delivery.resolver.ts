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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CreateDeliveryInput, UpdateDeliveryInput } from './dto/delivery.input';
import { DeliveryEntity } from './entities/delivery.entity';
import { DeliveryUseCases } from './use-cases/delivery.use-cases';

@ObjectType()
export class DeliverableOrderCustomer {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) document?: string | null;
  @Field(() => String, { nullable: true }) address?: string | null;
  @Field(() => String, { nullable: true }) bairro?: string | null;
  @Field(() => String, { nullable: true }) cidade?: string | null;
  @Field(() => String, { nullable: true }) estado?: string | null;
  @Field(() => String, { nullable: true }) cep?: string | null;
  @Field(() => Float, { nullable: true }) latitude?: number | null;
  @Field(() => Float, { nullable: true }) longitude?: number | null;
}

@ObjectType()
export class DeliverableOrder {
  @Field(() => ID) id!: string;
  @Field(() => Int) number!: number;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => Float) total!: number;
  @Field() createdAt!: Date;
  @Field(() => DeliverableOrderCustomer, { nullable: true }) customer?: DeliverableOrderCustomer | null;
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
  constructor(
    private readonly useCases: DeliveryUseCases,
    private readonly tenancy: TenancyService,
  ) {}

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
    @CurrentUser() user: User,
    @Args('input') input: CreateDeliveryInput,
  ): Promise<DeliveryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id, companyId }, input);
  }

  @Mutation(() => DeliveryEntity)
  async updateDelivery(
    @CurrentUser() user: User,
    @Args('input') input: UpdateDeliveryInput,
  ): Promise<DeliveryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id, companyId }, input);
  }

  @Mutation(() => DeliveryEntity)
  async completeDelivery(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('notes', { nullable: true }) notes?: string,
  ): Promise<DeliveryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.complete({ userId: user.id, companyId }, id, notes);
  }

  @Mutation(() => DeliveryEntity)
  async cancelDelivery(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<DeliveryEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.cancel({ userId: user.id, companyId }, id);
  }
}
