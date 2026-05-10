import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateRecurringBillInput {
  @Field() @IsString() @MaxLength(160) supplierName!: string;
  @Field() @IsString() @MaxLength(500) description!: string;
  @Field(() => Float) @IsNumber() @IsPositive() amount!: number;
  @Field(() => Int) @IsInt() @Min(1) @Max(31) dayOfMonth!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

@InputType()
export class UpdateRecurringBillInput {
  @Field() @IsString() id!: string;

  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(160) supplierName?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) description?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @IsPositive() amount?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) @Max(31) dayOfMonth?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() interestRate?: number;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(1000) notes?: string | null;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() active?: boolean;
}
