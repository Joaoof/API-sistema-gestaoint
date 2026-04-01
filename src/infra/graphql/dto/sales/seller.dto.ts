/* eslint-disable no-unused-vars */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SellerGraphQL {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  active: boolean;

  @Field(() => Float)
  totalCommission: number;

  @Field(() => Int)
  totalPoints: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
