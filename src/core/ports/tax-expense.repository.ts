import { Tax } from "../entities/tax.entity";
import { FindAllTaxExpenseInput } from "../use-cases/taxExpenses/dtos/[get]/find-all-tax-expense.input";

export interface TaxExpenseRepository {
    create(tax: Tax): Promise<void>;
    findAll(userId: string, filters: FindAllTaxExpenseInput): Promise<Tax[]>
}