import { Field, InputType, Int } from '@nestjs/graphql';
import {
  MessageDirection,
  MessageStatus,
  NotificationChannel,
} from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class MessageLogFilterInput {
  @Field(() => NotificationChannel, { nullable: true })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @Field(() => MessageStatus, { nullable: true })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @Field(() => MessageDirection, { nullable: true })
  @IsOptional()
  @IsEnum(MessageDirection)
  direction?: MessageDirection;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
