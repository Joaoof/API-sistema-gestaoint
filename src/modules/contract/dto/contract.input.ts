import { Field, Float, InputType } from '@nestjs/graphql';
import {
  BillingCycle,
  ContractStatus,
  ServiceLevelKind,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateContractInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  number!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @Field()
  @IsString()
  customerId!: string;

  @Field(() => ContractStatus, { defaultValue: ContractStatus.DRAFT })
  @IsEnum(ContractStatus)
  status!: ContractStatus;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  value!: number;

  @Field(() => BillingCycle, { defaultValue: BillingCycle.ONCE })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @Field({ defaultValue: false })
  @IsBoolean()
  autoRenew!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  terms?: string;
}

@InputType()
export class UpdateContractInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  number?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field(() => ContractStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @Field(() => BillingCycle, { nullable: true })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  terms?: string;
}

@InputType()
export class ContractFilterInput {
  @Field(() => ContractStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}

@InputType()
export class CreateServiceLevelInput {
  @Field(() => ServiceLevelKind)
  @IsEnum(ServiceLevelKind)
  kind!: ServiceLevelKind;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => Float)
  @IsNumber()
  targetValue!: number;

  @Field()
  @IsString()
  @MaxLength(40)
  unit!: string;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  penaltyPercent!: number;

  @Field({ defaultValue: true })
  @IsBoolean()
  active!: boolean;
}

@InputType()
export class UpdateServiceLevelInput {
  @Field(() => ServiceLevelKind, { nullable: true })
  @IsOptional()
  @IsEnum(ServiceLevelKind)
  kind?: ServiceLevelKind;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penaltyPercent?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class CreateServiceLevelEventInput {
  @Field(() => Float)
  @IsNumber()
  measuredValue!: number;

  @Field()
  @IsBoolean()
  met!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
