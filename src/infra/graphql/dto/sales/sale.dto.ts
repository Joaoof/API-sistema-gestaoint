/* eslint-disable no-unused-vars */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SaleItemGraphQL {
  @Field(() => ID)
  id: string;

  @Field()
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Float)
  totalPrice: number;
}

@ObjectType()
export class SaleGraphQL {
  @Field(() => ID)
  id: string;

  @Field()
  sellerId: string;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => Float)
  commissionAmount: number;

  @Field(() => Int)
  pointsEarned: number;

  @Field()
  createdAt: Date;

  @Field(() => [SaleItemGraphQL])
  items: SaleItemGraphQL[];
}
