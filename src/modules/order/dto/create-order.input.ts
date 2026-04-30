import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { OrderPaymentMethod, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

@InputType()
export class CreateOrderItemInput {
  @Field()
  @IsString()
  productId!: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  quantity!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  discount!: number;
}

@InputType()
export class CreateOrderInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerDocument?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @Field(() => OrderStatus, { defaultValue: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @Field(() => OrderPaymentMethod, { defaultValue: OrderPaymentMethod.CASH })
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  discount!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @Field(() => [CreateOrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];
}
