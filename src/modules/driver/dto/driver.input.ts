import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateDriverInput {
  @Field()
  @IsString()
  @MaxLength(160)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  cnh?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  cnhCategory?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  document?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  vehicle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  vehiclePlate?: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  active!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

@InputType()
export class UpdateDriverInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  cnh?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  cnhCategory?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  document?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  vehicle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  vehiclePlate?: string | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
