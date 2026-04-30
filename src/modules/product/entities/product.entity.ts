import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProductStatus } from '@prisma/client';
import { ProductImageEntity } from './product-image.entity';

registerEnumType(ProductStatus, { name: 'ProductStatus' });

@ObjectType()
export class ProductEntity {
  @Field(() => ID) id!: string;
  @Field({ nullable: true }) sku?: string | null;
  @Field() nameProduct!: string;
  @Field(() => Int) quantity!: number;
  @Field(() => Int) minStock!: number;
  @Field() unit!: string;
  @Field(() => Float, { nullable: true }) weight?: number | null;
  @Field(() => Float) costPrice!: number;
  @Field(() => Float) salePrice!: number;
  @Field(() => ProductStatus) status!: ProductStatus;

  @Field({ nullable: true }) categoryId?: string | null;
  @Field({ nullable: true }) supplierId?: string | null;
  @Field({ nullable: true }) description?: string | null;

  @Field(() => [ProductImageEntity]) images!: ProductImageEntity[];

  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
