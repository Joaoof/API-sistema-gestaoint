import { Field, InputType, Int } from '@nestjs/graphql';
import {
  NotificationSeverity,
  NotificationType,
} from '@prisma/client';
import {
  IsBoolean,
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
export class NotificationFilterInput {
  @Field(() => NotificationType, { nullable: true })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @Field(() => NotificationSeverity, { nullable: true })
  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

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

@InputType()
export class CreateNotificationInput {
  @Field(() => NotificationType)
  @IsEnum(NotificationType)
  type!: NotificationType;

  @Field(() => NotificationSeverity, {
    defaultValue: NotificationSeverity.INFO,
  })
  @IsEnum(NotificationSeverity)
  severity!: NotificationSeverity;

  @Field()
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field()
  @IsString()
  @MaxLength(2000)
  message!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  href?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  entity?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  entityId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;
}
