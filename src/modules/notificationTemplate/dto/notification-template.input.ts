import { Field, InputType } from '@nestjs/graphql';
import { NotificationChannel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateNotificationTemplateInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  key!: string;

  @Field(() => NotificationChannel)
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @Field()
  @IsString()
  @MaxLength(160)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @Field()
  @IsString()
  @MinLength(1)
  body!: string;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  active!: boolean;
}

@InputType()
export class UpdateNotificationTemplateInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  key?: string;

  @Field(() => NotificationChannel, { nullable: true })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  body?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
