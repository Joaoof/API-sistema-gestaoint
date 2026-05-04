import { Field, Float, InputType, Int, registerEnumType } from '@nestjs/graphql';
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

registerEnumType(ProductKind, { name: 'ProductKind' });

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
  @Field(() => ProductKind, { defaultValue: ProductKind.PRODUCT })
  @IsEnum(ProductKind)
  kind!: ProductKind;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @Field()
  @IsString()
  @MaxLength(160)
  nameProduct!: string;

  /**
   * Unidade do item. Para SERVICE/LABOR, costuma ser "SERV" / "HORA".
   */
  @Field({ defaultValue: 'UN' })
  @IsString()
  unit!: string;

  /**
   * Custo. Mão de obra pode ter custo zero (sem insumo) — por isso aceita 0.
   */
  @Field(() => Float)
  @IsNumber()
  @Min(0)
  costPrice!: number;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  salePrice!: number;

  /**
   * Estoque inicial. Ignorado para SERVICE/LABOR (forçado a 0 no use-case).
   */
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
