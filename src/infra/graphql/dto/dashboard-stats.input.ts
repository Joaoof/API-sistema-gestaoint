import { Field, InputType, ObjectType } from "@nestjs/graphql";

@InputType()
export class DashboardStatsInput {
    @Field(() => String, { nullable: true })
    date?: string;
}