import { registerEnumType } from "@nestjs/graphql";

export const TaxExpenses = {
    PENDING: "PENDING",
    PAID: "PAID",
    OVERDUE: "OVERDUE"
}

export type TaxExpense =
    (typeof TaxExpenses)[keyof typeof TaxExpenses]

const TaxExpense = TaxExpenses;

registerEnumType(TaxExpenses, {
    name: "TaxExpense"
})