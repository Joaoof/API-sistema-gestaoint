import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateWarehouseInput {
  @Field() @IsString() @MaxLength(80) name!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(40) code?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(255) address?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() isMain?: boolean;
}

@InputType()
export class UpdateWarehouseInput {
  @Field() @IsString() id!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(80) name?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() code?: string | null;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() address?: string | null;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() isMain?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() active?: boolean;
}

@InputType()
export class InventoryAdjustInput {
  @Field() @IsString() productId!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() warehouseId?: string;
  @Field(() => Int) @IsInt() @IsPositive() quantity!: number;
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  unitCost?: number;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(255) reason?: string;
}

@InputType()
export class InventoryTransferInput {
  @Field() @IsString() productId!: string;
  @Field() @IsString() fromWarehouseId!: string;
  @Field() @IsString() toWarehouseId!: string;
  @Field(() => Int) @IsInt() @IsPositive() quantity!: number;
  @Field({ nullable: true }) @IsOptional() @IsString() reason?: string;
}
