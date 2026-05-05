import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class UpsertCompanySettingsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  dateFormat?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  timeFormat?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  numberDecimals?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  numberDecimalSep?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 1)
  numberThousandSep?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartsOn?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(500)
  defaultPageSize?: number;
}
