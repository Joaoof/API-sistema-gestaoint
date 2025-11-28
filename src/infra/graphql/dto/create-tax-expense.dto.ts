import { Field, Float, InputType } from "@nestjs/graphql";
import { TaxExpense } from "../enum/TaxExpense.enum";

@InputType()
export class CreateTaxExpenseInput {
    @Field(() => String)
    supplier: string

    @Field(() => Float)
    value: number

    @Field(() => String)
    description: string

    @Field(() => Date)
    dueDate: Date

    @Field(() => String)
    status: TaxExpense
}   