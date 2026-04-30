import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';
import { ProductEntity } from '../../product/entities/product.entity';

@ObjectType()
export class SupplierMiniEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) email?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
}

@ObjectType()
export class AccountPayableEntity {
  @Field(() => ID) id!: string;
  @Field(() => String, { nullable: true }) supplierId?: string | null;
  @Field(() => String, { nullable: true }) productId?: string | null;
  @Field() supplierName!: string;
  @Field() description!: string;
  @Field(() => Float) amount!: number;
  @Field(() => Float) interestRate!: number;
  @Field() dueDate!: Date;
  @Field(() => Date, { nullable: true }) paidAt?: Date | null;
  @Field(() => AccountStatus) status!: AccountStatus;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;

  @Field(() => Float) finalAmount!: number;
  @Field(() => Float) interestAccrued!: number;
  @Field() daysOverdue!: number;

  @Field(() => SupplierMiniEntity, { nullable: true }) supplier?:
    | SupplierMiniEntity
    | null;
  @Field(() => ProductEntity, { nullable: true }) product?: ProductEntity | null;
}
