import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { CreateTaxExpenseUseCase } from 'src/core/use-cases/taxExpenses/create-tax-expense.use-case';
import { FindAllTaxExpenseUseCase } from 'src/core/use-cases/taxExpenses/find-all-tax-expense.use-case';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaTaxRepository } from 'src/infra/database/implementations/tax/tax.prisma.repository';
import { TaxExpenseResolver } from 'src/infra/graphql/resolvers/tax-expense.resolver';

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [
        CreateTaxExpenseUseCase,
        FindAllTaxExpenseUseCase,
        TaxExpenseResolver,
        {
            provide: 'TaxExpenseRepository',
            useClass: PrismaTaxRepository,
        },
    ],
    exports: [
        CreateTaxExpenseUseCase
    ]
})
export class TaxExpenseModule { }
