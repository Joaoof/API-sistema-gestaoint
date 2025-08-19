// entities/dashboard-stats.entity.ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
class TodayStats {
    @Field(() => Number)
    entries: number;

    @Field(() => Number)
    exits: number;

    @Field(() => Number)
    balance: number;
}

@ObjectType()
export class DashboardStats {
    @Field(() => TodayStats)
    today: TodayStats;

    @Field(() => Number)
    monthlyTotal: number;
}