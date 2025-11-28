import { PrismaService } from "prisma/prisma.service";
import { Tax } from '../../../../core/entities/tax.entity';
import { Injectable } from "@nestjs/common";
import { TaxExpenseRepository } from "src/core/ports/tax-expense.repository";

@Injectable()
export class PrismaTaxRepository implements TaxExpenseRepository {
    private readonly prisma: PrismaService;
    constructor(prisma: PrismaService) {
        this.prisma = prisma;
    }

    async create(tax: Tax) {
        await this.prisma.taxExpense.create({
            data: {
                supplier: tax.supplier,
                value: tax.value,
                description: tax.description,
                dueDate: tax.dueDate,
                status: tax.status,
                user_id: tax.user_id,
            }
        })
    }

    async findAll(userId: string): Promise<Tax[]> {
        const tax = await this.prisma.taxExpense.findMany({
            where: {
                user_id: userId
            },
            orderBy: {
                id: 'asc'
            }
        })

        return tax.map(Tax.fromPrisma)
    }
}