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
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CreateOrderInput } from './dto/create-order.input';
import { OrderPrintDto } from './dto/order-print.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderUseCases } from './use-cases/order.use-cases';

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
  constructor(
    private readonly useCases: OrderUseCases,
    private readonly tenancy: TenancyService,
  ) {}

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

  @Query(() => OrderPrintDto)
  async orderForPrint(@Args('id') id: string): Promise<OrderPrintDto> {
    return this.useCases.findForPrint(id);
  }

  @Mutation(() => OrderEntity)
  async createOrder(
    @CurrentUser() user: User,
    @Args('input') input: CreateOrderInput,
  ): Promise<OrderEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id, companyId }, input);
  }

  @Mutation(() => OrderEntity)
  async cancelOrder(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<OrderEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.cancel({ userId: user.id, companyId }, id);
  }

  @Mutation(() => Boolean)
  async deleteOrder(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id, companyId }, id);
  }

  /**
   * Atalho "recebi o pagamento" — marca AR como pago + cria movimento de
   * entrada no caixa + marca order como PAID, tudo numa transação.
   */
  @Mutation(() => OrderEntity)
  async payOrderShortcut(
    @CurrentUser() user: User,
    @Args('orderId') orderId: string,
    @Args('paymentMethod', { nullable: true }) paymentMethod?: string,
    @Args('bankId', { nullable: true }) bankId?: string,
    @Args('receivedAmount', { type: () => Float, nullable: true })
    receivedAmount?: number,
  ): Promise<OrderEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.payOrderShortcut(
      { userId: user.id, companyId },
      orderId,
      {
        paymentMethod: paymentMethod as
          | 'CASH'
          | 'PIX'
          | 'CREDIT_CARD'
          | 'DEBIT_CARD'
          | 'OTHER'
          | undefined,
        bankId,
        receivedAmount,
      },
    );
  }
}
