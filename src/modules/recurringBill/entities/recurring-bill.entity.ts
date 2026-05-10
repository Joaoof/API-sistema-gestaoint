import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecurringBillEntity {
  @Field() id!: string;
  @Field() supplierName!: string;
  @Field() description!: string;
  @Field(() => Float) amount!: number;
  @Field(() => Int) dayOfMonth!: number;
  @Field(() => Float) interestRate!: number;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() active!: boolean;
  @Field(() => String, { nullable: true }) lastGeneratedFor?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
