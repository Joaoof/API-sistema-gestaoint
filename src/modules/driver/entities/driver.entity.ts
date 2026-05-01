import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DriverEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) photoUrl?: string | null;
  @Field(() => String, { nullable: true }) cnh?: string | null;
  @Field(() => String, { nullable: true }) cnhCategory?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) document?: string | null;
  @Field(() => String, { nullable: true }) vehicle?: string | null;
  @Field(() => String, { nullable: true }) vehiclePlate?: string | null;
  @Field() active!: boolean;
  @Field(() => Int) totalDeliveries!: number;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
