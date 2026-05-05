import { Field, InputType } from '@nestjs/graphql';
import { FinancialAccountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateFinancialAccountInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @Field(() => FinancialAccountType)
  @IsEnum(FinancialAccountType)
  type!: FinancialAccountType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  active!: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

@InputType()
export class UpdateFinancialAccountInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @Field(() => FinancialAccountType, { nullable: true })
  @IsOptional()
  @IsEnum(FinancialAccountType)
  type?: FinancialAccountType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

@InputType()
export class FinancialAccountFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => FinancialAccountType, { nullable: true })
  @IsOptional()
  @IsEnum(FinancialAccountType)
  type?: FinancialAccountType;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}
