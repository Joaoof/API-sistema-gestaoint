import { Inject } from "@nestjs/common";
import { Tax } from "../../entities/tax.entity";
import { TaxExpenseRepository } from "../../ports/tax-expense.repository";
import { CreateTaxExpenseDto, CreateTaxExpenseSchema } from "../../dtos/create-tax-expense.core-dto";
import { TaxExpenseMapper } from "src/core/mappers/tax-expense.mapper";

export class CreateTaxExpenseUseCase {
    private readonly taxExpenseRepo: TaxExpenseRepository
    constructor(
        @Inject('TaxExpenseRepository')
        taxExpenseRepo: TaxExpenseRepository
    ) {
        this.taxExpenseRepo = taxExpenseRepo;
    }

    async execute(
        dto: CreateTaxExpenseDto,
        userId: string
    ): Promise<Tax> {
        const validatedDto = CreateTaxExpenseSchema.parse({
            ...dto,
            user_id: userId
        })
        const taxExpense = TaxExpenseMapper.toDomain(validatedDto, userId);
        await this.taxExpenseRepo.create(taxExpense);
        return taxExpense;
    }
}