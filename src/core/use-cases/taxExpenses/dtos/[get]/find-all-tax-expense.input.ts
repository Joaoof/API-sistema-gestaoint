import { Field, Float, InputType } from "@nestjs/graphql";
import { TaxExpense, TaxExpenses } from "src/infra/graphql/enum/TaxExpense.enum";

@InputType()
export class FindAllTaxExpenseInput {
    @Field(() => String)
    supplier: string

    @Field(() => Float)
    value: number

    @Field(() => String)
    description: string

    @Field(() => Date)
    dueDate: Date

    @Field(() => TaxExpenses)
    status: TaxExpense
}