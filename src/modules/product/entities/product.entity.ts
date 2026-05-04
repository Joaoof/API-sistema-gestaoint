import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProductKind, ProductStatus } from '@prisma/client';
import { ProductImageEntity } from './product-image.entity';

registerEnumType(ProductStatus, { name: 'ProductStatus' });
registerEnumType(ProductKind, { name: 'ProductKind' });

@ObjectType()
export class ProductEntity {
  @Field(() => ID) id!: string;
  @Field(() => ProductKind) kind!: ProductKind;
  @Field(() => String, { nullable: true }) sku?: string | null;
  @Field() nameProduct!: string;
  @Field(() => Int) quantity!: number;
  @Field(() => Int) minStock!: number;
  @Field() unit!: string;
  @Field(() => Float, { nullable: true }) weight?: number | null;
  @Field(() => Float) costPrice!: number;
  @Field(() => Float) salePrice!: number;
  @Field(() => ProductStatus) status!: ProductStatus;

  @Field(() => String, { nullable: true }) categoryId?: string | null;
  @Field(() => String, { nullable: true }) supplierId?: string | null;
  @Field(() => String, { nullable: true }) description?: string | null;

  @Field(() => [ProductImageEntity]) images!: ProductImageEntity[];

  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
