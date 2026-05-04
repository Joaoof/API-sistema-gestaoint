import { Field, Float, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
  OrderPaymentMethod,
  OrderStatus,
  OrderType,
} from '@prisma/client';
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

registerEnumType(OrderType, { name: 'OrderType' });

@InputType()
export class CreateOrderItemInput {
  @Field()
  @IsString()
  productId!: string;

  /**
   * Quantidade. Para itens do tipo LABOR / SERVICE, o use-case força para 1
   * (mão de obra não tem "quantidade" no sentido de estoque).
   */
  @Field(() => Int, { defaultValue: 1 })
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

  /**
   * Descrição extra/específica para o item (ex.: "Instalação de tomada na cozinha").
   * Útil principalmente para SERVICE/LABOR e itens de encomenda.
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
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

  /**
   * STANDARD = pronta-entrega, baixa estoque imediatamente (quando CONFIRMED/PAID).
   * CUSTOM_ORDER = encomenda; estoque NÃO é decrementado mesmo em CONFIRMED,
   * pois o item ainda será produzido/buscado. Usa expectedDeliveryDate.
   */
  @Field(() => OrderType, { defaultValue: OrderType.STANDARD })
  @IsEnum(OrderType)
  orderType!: OrderType;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  expectedDeliveryDate?: Date;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  depositAmount!: number;

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
