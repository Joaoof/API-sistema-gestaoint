import { Field, Float, InputType } from '@nestjs/graphql';
import { MovementTypePayment } from '@prisma/client';
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
export class RecordPaymentInput {
  @Field() @IsString() accountId!: string;

  @Field(() => Float) @IsNumber() @IsPositive() amount!: number;

  @Field(() => MovementTypePayments)
  @IsEnum(MovementTypePayments)
  paymentMethod!: MovementTypePayment;

  @Field({ nullable: true }) @IsOptional() @IsString() bankId?: string | null;

  @Field({ nullable: true }) @IsOptional() @IsDateString() paidAt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
