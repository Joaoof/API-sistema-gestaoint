import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderPaymentMethod, OrderStatus } from '@prisma/client';
import { CustomerEntity } from '../../customer/entities/customer.entity';

registerEnumType(OrderStatus, { name: 'OrderStatus' });
registerEnumType(OrderPaymentMethod, { name: 'OrderPaymentMethod' });

@ObjectType()
export class OrderItemEntity {
  @Field(() => ID) id!: string;
  @Field() productId!: string;
  @Field() productName!: string;
  @Field(() => Int) quantity!: number;
  @Field(() => Float) unitPrice!: number;
  @Field(() => Float) discount!: number;
  @Field(() => Float) total!: number;
}

@ObjectType()
export class OrderEntity {
  @Field(() => ID) id!: string;
  @Field(() => Int) number!: number;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => OrderStatus) status!: OrderStatus;
  @Field(() => OrderPaymentMethod) paymentMethod!: OrderPaymentMethod;
  @Field(() => Float) subtotal!: number;
  @Field(() => Float) discount!: number;
  @Field(() => Float) total!: number;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;

  @Field(() => CustomerEntity, { nullable: true }) customer?: CustomerEntity | null;
  @Field(() => [OrderItemEntity]) items!: OrderItemEntity[];
}
