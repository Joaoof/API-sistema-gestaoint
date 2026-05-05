import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  OpportunityActivityStatus,
  OpportunityActivityType,
  OpportunityStage,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateOpportunityInput {
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
  @MaxLength(40)
  customerPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerEmail?: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @Field(() => OpportunityStage, { defaultValue: OpportunityStage.NEW })
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  value!: number;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(0)
  @Max(100)
  probability!: number;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedCloseDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

@InputType()
export class UpdateOpportunityInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  customerId?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerEmail?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  source?: string;

  @Field(() => OpportunityStage, { nullable: true })
  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedCloseDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string;
}

@InputType()
export class OpportunityFilterInput {
  @Field(() => OpportunityStage, { nullable: true })
  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}

@InputType()
export class CreateActivityInput {
  @Field(() => OpportunityActivityType)
  @IsEnum(OpportunityActivityType)
  type!: OpportunityActivityType;

  @Field()
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}

@InputType()
export class UpdateActivityInput {
  @Field(() => OpportunityActivityType, { nullable: true })
  @IsOptional()
  @IsEnum(OpportunityActivityType)
  type?: OpportunityActivityType;

  @Field(() => OpportunityActivityStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OpportunityActivityStatus)
  status?: OpportunityActivityStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}
