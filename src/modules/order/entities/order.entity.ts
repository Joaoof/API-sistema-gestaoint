import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  OrderPaymentMethod,
  OrderStatus,
  OrderType,
  ProductKind,
} from '@prisma/client';
import { CustomerEntity } from '../../customer/entities/customer.entity';

registerEnumType(OrderStatus, { name: 'OrderStatus' });
registerEnumType(OrderPaymentMethod, { name: 'OrderPaymentMethod' });
registerEnumType(OrderType, { name: 'OrderType' });
registerEnumType(ProductKind, { name: 'ProductKind' });

@ObjectType()
export class OrderItemEntity {
  @Field(() => ID) id!: string;
  @Field() productId!: string;
  @Field() productName!: string;
  @Field(() => ProductKind) itemKind!: ProductKind;
  @Field() itemUnit!: string;
  @Field(() => Int) quantity!: number;
  @Field(() => Float) unitPrice!: number;
  @Field(() => Float) discount!: number;
  @Field(() => Float) total!: number;
  @Field(() => String, { nullable: true }) description?: string | null;
}

@ObjectType()
export class OrderEntity {
  @Field(() => ID) id!: string;
  @Field(() => Int) number!: number;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => String, { nullable: true }) customerDocument?: string | null;
  @Field(() => String, { nullable: true }) customerPhone?: string | null;
  @Field(() => String, { nullable: true }) sellerId?: string | null;
  @Field(() => String, { nullable: true }) sellerName?: string | null;
  @Field(() => Float) commissionPercent!: number;
  @Field(() => Float) commissionAmount!: number;
  @Field(() => OrderStatus) status!: OrderStatus;
  @Field(() => OrderPaymentMethod) paymentMethod!: OrderPaymentMethod;
  @Field(() => OrderType) orderType!: OrderType;
  @Field(() => Date, { nullable: true }) expectedDeliveryDate?: Date | null;
  @Field(() => Float) depositAmount!: number;
  @Field(() => Float) subtotal!: number;
  @Field(() => Float) discount!: number;
  @Field(() => Float) total!: number;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;

  @Field(() => CustomerEntity, { nullable: true }) customer?: CustomerEntity | null;
  @Field(() => [OrderItemEntity]) items!: OrderItemEntity[];
}
