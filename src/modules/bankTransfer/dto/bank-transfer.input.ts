import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

@InputType()
export class BankTransferInput {
  @Field() @IsString() fromBankId!: string;
  @Field() @IsString() toBankId!: string;
  @Field(() => Float) @IsNumber() @IsPositive() value!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  date?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
