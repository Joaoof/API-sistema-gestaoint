import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/core/entities/user.entity';
import { CashMovementGraphQL } from '../dto/cash-movement.dto';
import { CreateCashMovementUseCase } from 'src/core/use-cases/cashMovement/create-cash-movement.use-case';
import { FindAllCashMovementUseCase } from 'src/core/use-cases/cashMovement/find-all-cash-movement.use-case';
import { CashMovementMapper } from 'src/modules/cashMovement/mappers/entry-movement.mapper';
import { CreateCashMovementInput } from '../dto/create-cash-movement.dto';
import { CashMovementType } from '../enum/cash-movement-type.enum';
import { CashMovementCategory } from '../enum/cash-movement-category.enum';
import { FindAllCashMovementInput } from '../dto/find-all-cash-movement.input';
import { DashboardStats } from '../dto/dashboard-stats.entity';
import { DashboardMovementUseCase } from 'src/core/use-cases/cashMovement/dashboard-movement.use-case';
import { DashboardStatsInput } from '../dto/dashboard-stats.input';

@Resolver(() => CashMovementGraphQL)
export class CashMovementResolver {
    constructor(
        private readonly createCashMovementUseCase: CreateCashMovementUseCase,
        private readonly findAllCashMovementUseCase: FindAllCashMovementUseCase,
        private readonly dashboardMovementUseCase: DashboardMovementUseCase
    ) { }

    @Mutation(() => CashMovementGraphQL)
    @UseGuards(GqlAuthGuard)
    async createCashMovement(
        @Args('input') input: CreateCashMovementInput,
        @CurrentUser() user: User,
    ): Promise<CashMovementGraphQL> {
        const dto = {
            ...input,
            user_id: user.id,
        }
        const cashMovementResolver = await this.createCashMovementUseCase.execute(dto, user.id);

        const messages = {
            SALE: 'Venda registrada com sucesso!',
            CHANGE: 'Troco registrado com sucesso!',
            OTHER_IN: 'Entrada registrada com sucesso!',
            EXPENSE: 'Despesa registrada com sucesso!',
            WITHDRAWAL: 'Saque registrado com sucesso!',
            PAYMENT: 'Pagamento registrado com sucesso!',
        };

        const message = messages[cashMovementResolver.category] || 'Movimentação registrada com sucesso!';

        return {
            id: cashMovementResolver.id,
            type: cashMovementResolver.type as CashMovementType,
            category: cashMovementResolver.category as CashMovementCategory,
            value: cashMovementResolver.value,
            description: cashMovementResolver.description,
            date: cashMovementResolver.date,
            user_id: cashMovementResolver.user_id ?? '',
            message

        }
    }

    @Query(() => [CashMovementGraphQL], { name: 'cashMovements' })
    @UseGuards(GqlAuthGuard)
    async findAllCashMovement(
        @Args('input', { nullable: true }) input: FindAllCashMovementInput,
        @CurrentUser() user: User,
    ): Promise<CashMovementGraphQL[]> {
        const movements = await this.findAllCashMovementUseCase.execute(user.id, input);

        return movements.map(CashMovementMapper.toJSON);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => DashboardStats, { name: 'dashboardStats' })
    async dashboardStats(
        @Args('input', { nullable: true }) input: DashboardStatsInput,
        @CurrentUser() user: User) {
        const dashboard = await this.dashboardMovementUseCase.execute(user.id, input?.date ?? '');

        console.log(dashboard);


        return dashboard.toJSON();
    }
}