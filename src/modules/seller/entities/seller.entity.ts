import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SellerEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) email?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) document?: string | null;
  @Field(() => Float) commissionPercent!: number;
  @Field() active!: boolean;
  @Field(() => Float) totalCommission!: number;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
