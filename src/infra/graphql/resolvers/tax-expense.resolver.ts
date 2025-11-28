import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { TaxExpenseGraphQL } from "../dto/tax-expense.dto";
import { CreateTaxExpenseUseCase } from "src/core/use-cases/taxExpenses/create-tax-expense.use-case";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "src/auth/guards/auth.guard";
import { CreateTaxExpenseInput } from "../dto/create-tax-expense.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/core/entities/user.entity";
import { FindAllTaxExpenseInput } from "src/core/use-cases/taxExpenses/dtos/[get]/find-all-tax-expense.input";
import { FindAllTaxExpenseUseCase } from "src/core/use-cases/taxExpenses/find-all-tax-expense.use-case";
import { TaxExpenseMapper } from "src/core/mappers/tax-expense.mapper";

@Resolver(() => TaxExpenseGraphQL)
export class TaxExpenseResolver {
    private readonly createTaxExpenseUseCase: CreateTaxExpenseUseCase;
    private readonly findAllTaxExpenseUseCase: FindAllTaxExpenseUseCase;
    constructor(
        createTaxExpense: CreateTaxExpenseUseCase,
        findAllTaxExpense: FindAllTaxExpenseUseCase
    ) {
        this.createTaxExpenseUseCase = createTaxExpense;
        this.findAllTaxExpenseUseCase = findAllTaxExpense
    }

    @Mutation(() => TaxExpenseGraphQL)
    @UseGuards(GqlAuthGuard)
    async createTaxExpense(
        @Args('input') input: CreateTaxExpenseInput,
        @CurrentUser() user: User,
    ): Promise<TaxExpenseGraphQL> {
        const dto = {
            ...input,
            status: input.status as "PENDING" | "PAID" | "OVERDUE"
        };

        console.log(dto);


        const taxExpenseResolver = await this.createTaxExpenseUseCase.execute(dto, user.id);

        return {
            id: taxExpenseResolver.id,
            supplier: taxExpenseResolver.supplier,
            value: taxExpenseResolver.value,
            description: taxExpenseResolver.description,
            dueDate: taxExpenseResolver.dueDate,
            status: taxExpenseResolver.status,
            user_id: taxExpenseResolver.user_id
        };
    }

    @Query(() => [TaxExpenseGraphQL], { name: 'taxExpenses' })
    @UseGuards(GqlAuthGuard)
    async findAllTaxExpense(
        @Args('input', { nullable: true }) input: FindAllTaxExpenseInput,
        @CurrentUser() user: User,
    ): Promise<TaxExpenseGraphQL[]> {
        const tax = await this.findAllTaxExpenseUseCase.execute(user.id, input)
        return tax.map(TaxExpenseMapper.toJSON)
    }

}