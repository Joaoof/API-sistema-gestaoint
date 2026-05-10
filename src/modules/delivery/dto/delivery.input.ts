import { Field, InputType } from '@nestjs/graphql';
import { DeliveryKind, DeliveryStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateDeliveryInput {
  @Field()
  @IsString()
  orderId!: string;

  @Field(() => DeliveryKind, { nullable: true, defaultValue: 'DELIVERY' })
  @IsOptional()
  @IsEnum(DeliveryKind)
  kind?: DeliveryKind;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  driver?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vehicle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destination?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

@InputType()
export class UpdateDeliveryInput {
  @Field()
  @IsString()
  id!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  driver?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vehicle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destination?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string | null;

  @Field(() => DeliveryStatus, { nullable: true })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @Field(() => DeliveryKind, { nullable: true })
  @IsOptional()
  @IsEnum(DeliveryKind)
  kind?: DeliveryKind;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
