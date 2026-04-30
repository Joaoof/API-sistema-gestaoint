import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class ProductImageInput {
  @Field()
  @IsString()
  url!: string;

  @Field()
  @IsString()
  key!: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  isPrimary!: boolean;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}

@InputType()
export class CreateProductInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @Field()
  @IsString()
  @MaxLength(160)
  nameProduct!: string;

  @Field({ defaultValue: 'UN' })
  @IsString()
  unit!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  costPrice!: number;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  salePrice!: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  minStock!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  active!: boolean;

  @Field(() => [ProductImageInput], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInput)
  images!: ProductImageInput[];
}
