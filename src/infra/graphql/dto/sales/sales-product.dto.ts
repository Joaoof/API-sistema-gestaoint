/* eslint-disable no-unused-vars */

import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SalesProductGraphQL {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  sku: string;

  @Field(() => Float)
  unitPrice: number;

  @Field()
  active: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
