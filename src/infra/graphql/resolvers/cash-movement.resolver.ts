import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/core/entities/user.entity';
import { CashMovementGraphQL } from '../dto/cash-movement.dto';
import { CreateCashMovementUseCase } from 'src/core/use-cases/entryMovement/create-cash-movement.use-case';
import { FindAllCashMovementUseCase } from 'src/core/use-cases/entryMovement/find-all-cash-movement.use-case';
import { CashMovementMapper } from 'src/modules/cashMovement/mappers/entry-movement.mapper';
import { CreateCashMovementInput } from '../dto/create-cash-movement.dto';
import { CashMovementType } from '../enum/cash-movement-type.enum';
import { CashMovementCategory } from '../enum/cash-movement-category.enum';

@Resolver(() => CashMovementGraphQL)
export class CashMovementResolver {
    constructor(
        private readonly createCashMovementUseCase: CreateCashMovementUseCase,
        private readonly findAllCashMovementUseCase: FindAllCashMovementUseCase,
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

        return {
            id: cashMovementResolver.id,
            type: cashMovementResolver.type as CashMovementType,
            category: cashMovementResolver.category as CashMovementCategory,
            value: cashMovementResolver.value,
            description: cashMovementResolver.description,
            createdAt: cashMovementResolver.date,
            user_id: cashMovementResolver.user_id ?? '',
        }
    }

    @Query(() => [CashMovementGraphQL], { name: 'entryMovement' })
    @UseGuards(GqlAuthGuard)
    async getEntryMovement() {
        const entryMovement = await this.findAllCashMovementUseCase.execute();
        return entryMovement.map(CashMovementMapper.toJSON)
    }
}