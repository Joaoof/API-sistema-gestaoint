import { Field, Float, InputType } from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateAccountPayableInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  productId?: string;

  @Field()
  @IsString()
  @MaxLength(160)
  supplierName!: string;

  @Field()
  @IsString()
  @MaxLength(500)
  description!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @Field(() => Float, { defaultValue: 0.033 })
  @IsNumber()
  interestRate!: number;

  @Field()
  @IsDateString()
  dueDate!: string;

  @Field(() => AccountStatus, { defaultValue: AccountStatus.PENDING })
  @IsEnum(AccountStatus)
  status!: AccountStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
