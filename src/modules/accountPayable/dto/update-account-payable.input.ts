import { Field, Float, InputType } from '@nestjs/graphql';
import { AccountStatus, MovementTypePayment } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { MovementTypePayments } from '../../../infra/graphql/enum/CashMovementTypePayement.enum';

@InputType()
export class UpdateAccountPayableInput {
  @Field()
  @IsString()
  id!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  productId?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplierName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  paidAt?: string | null;

  @Field(() => AccountStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bankId?: string | null;

  @Field(() => MovementTypePayments, { nullable: true })
  @IsOptional()
  @IsEnum(MovementTypePayments)
  paymentMethod?: MovementTypePayment;
}
