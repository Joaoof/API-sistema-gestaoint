import { Field, Float, ObjectType } from "@nestjs/graphql";
import { TaxExpense, TaxExpenses } from "../enum/TaxExpense.enum";

@ObjectType()
export class TaxExpenseGraphQL {
    @Field(() => String)
    id: string;

    @Field(() => String)
    supplier: string;

    @Field(() => Float)
    value: number;

    @Field(() => String)
    description: string;

    @Field(() => Date)
    dueDate: Date

    @Field(() => TaxExpenses)
    status: TaxExpense

    @Field(() => String)
    user_id: string;
}