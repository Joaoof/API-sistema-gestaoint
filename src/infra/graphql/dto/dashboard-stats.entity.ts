import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DashboardStats {
  @Field(() => Number)
  todayEntries: number;

  @Field(() => Number)
  todayExits: number;

  @Field(() => Number)
  todayBalance: number;

  @Field(() => Number)
  monthlyTotal: number;
}
