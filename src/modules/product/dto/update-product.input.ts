import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { ProductKind } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
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
import { ProductImageInput } from './create-product.input';

@InputType()
export class UpdateProductInput {
  @Field()
  @IsString()
  id!: string;

  @Field(() => ProductKind, { nullable: true })
  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameProduct?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salePrice?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /**
   * Se enviado, substitui completamente o conjunto de imagens do produto.
   * Imagens antigas removidas do R2; novas inseridas. Se omitido, imagens não mudam.
   */
  @Field(() => [ProductImageInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInput)
  images?: ProductImageInput[];
}
