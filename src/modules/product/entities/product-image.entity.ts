import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProductImageEntity {
  @Field(() => ID) id!: string;
  @Field() url!: string;
  @Field() key!: string;
  @Field() isPrimary!: boolean;
  @Field(() => Int) order!: number;
  @Field() createdAt!: Date;
}
