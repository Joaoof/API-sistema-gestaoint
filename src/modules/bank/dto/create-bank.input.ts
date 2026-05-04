import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BankAccountType } from '@prisma/client';

@InputType()
export class CreateBankInput {
  @Field()
  @IsString()
  @MaxLength(120)
  name!: string;

  @Field(() => BankAccountType, { defaultValue: BankAccountType.CHECKING })
  @IsEnum(BankAccountType)
  tipo!: BankAccountType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  agencia?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  conta?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  digito?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titular?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  documento?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  pixKey?: string;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  saldoInicial!: number;

  @Field({ defaultValue: '#3B82F6' })
  @IsHexColor()
  corHex!: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  ativo!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}

@InputType()
export class UpdateBankInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Field(() => BankAccountType, { nullable: true })
  @IsOptional()
  @IsEnum(BankAccountType)
  tipo?: BankAccountType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  agencia?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  conta?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  digito?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titular?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  documento?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  pixKey?: string | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  saldoInicial?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsHexColor()
  corHex?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;
}
