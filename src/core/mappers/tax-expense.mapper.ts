import { randomUUID } from 'crypto';
import { CreateTaxExpenseDto } from '../dtos/create-tax-expense.core-dto';
import { Tax } from '../entities/tax.entity';

export class TaxExpenseMapper {
    static toDomain(dto: CreateTaxExpenseDto, userId: string): Tax {
        return new Tax(
            randomUUID(),
            dto.supplier,
            dto.value,
            dto.description,
            dto.dueDate,
            dto.status,
            dto.user_id ?? userId,
        );
    }

    static toJSON(tax: Tax): any {
        return {
            id: tax.id,
            supplier: tax.supplier,
            value: tax.value,
            description: tax.description,
            dueDate: new Date(tax.dueDate),
            status: tax.status,
            user_id: tax.user_id
        };
    }
}
