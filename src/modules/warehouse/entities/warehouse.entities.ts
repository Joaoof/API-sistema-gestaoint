import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WarehouseEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) code?: string | null;
  @Field(() => String, { nullable: true }) address?: string | null;
  @Field() isMain!: boolean;
  @Field() active!: boolean;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class ProductInventoryBalance {
  @Field() warehouseId!: string;
  @Field() warehouseName!: string;
  @Field() isMain!: boolean;
  @Field(() => Int) quantity!: number;
  @Field(() => Int) minStock!: number;
}

@ObjectType()
export class InventoryAdjustmentResult {
  @Field() productId!: string;
  @Field() warehouseId!: string;
  @Field(() => Int) productQuantity!: number;
  @Field(() => Float, { nullable: true }) averageCost?: number | null;
}

@ObjectType()
export class InventoryTransferResult {
  @Field() transferId!: string;
  @Field() from!: string;
  @Field() to!: string;
  @Field(() => Int) quantity!: number;
}
