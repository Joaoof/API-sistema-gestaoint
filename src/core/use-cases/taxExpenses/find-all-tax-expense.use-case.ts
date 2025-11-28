import { ForbiddenException, Inject } from "@nestjs/common";
import { TaxExpenseRepository } from "src/core/ports/tax-expense.repository";
import { Tax } from "src/core/entities/tax.entity";
import { FindAllTaxExpenseInput } from "./dtos/[get]/find-all-tax-expense.input";

export class FindAllTaxExpenseUseCase {
    private readonly taxExpenseRepo: TaxExpenseRepository
    constructor(
        @Inject('TaxExpenseRepository')
        taxExpenseRepo: TaxExpenseRepository
    ) {
        this.taxExpenseRepo = taxExpenseRepo;
    }

    async execute(userId: string, filters: FindAllTaxExpenseInput): Promise<Tax[]> {
        if (!userId) {
            throw new ForbiddenException()
        }

        return this.taxExpenseRepo.findAll(userId, filters)
    }
}