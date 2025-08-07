import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/core/entities/user.entity';
import { CreateEntryMovementUseCase } from 'src/core/use-cases/entryMovement/create-entry-movement.use-case';
import { CreateEntryMovementInput } from '../dto/create-entry-movement.input';
import { EntryMovementGraphQL } from '../dto/entry-movement.dto';
import { EntryTypeClient } from '../dto/entry-type-client.enum';
import { FindAllEntryMovementUseCase } from 'src/core/use-cases/entryMovement/find-all-entry-movement.use-case';
import { EntryMovementMapper } from 'src/modules/entryMovement/mappers/entry-movement.mapper';

@Resolver(() => EntryMovementGraphQL)
export class EntryMovementResolver {
    constructor(
        private readonly createEntryMovementUseCase: CreateEntryMovementUseCase,
        private readonly findAllEntryMovementUseCase: FindAllEntryMovementUseCase,
    ) { }

    @Mutation(() => EntryMovementGraphQL)
    @UseGuards(GqlAuthGuard)
    async createEntryMovement(
        @Args('input') input: CreateEntryMovementInput,
        @CurrentUser() user: User,
    ): Promise<EntryMovementGraphQL> {
        const dto = {
            typeEntry: input.typeEntry as unknown as EntryTypeClient,
            value: input.value,
            description: input.description ?? '',
            user_id: user.id,
        };

        const entryMovementResolver = await this.createEntryMovementUseCase.execute(dto, user.id);

        return {
            id: entryMovementResolver.id,
            user_id: entryMovementResolver.user_id,
            typeEntry: entryMovementResolver.typeEntry as unknown as EntryTypeClient,
            value: entryMovementResolver.value,
            description: entryMovementResolver.description,
            createdAt: entryMovementResolver.createdAt,
        }
    }

    @Query(() => [EntryMovementGraphQL], { name: 'entryMovement' })
    @UseGuards(GqlAuthGuard)
    async getEntryMovement() {
        const entryMovement = await this.findAllEntryMovementUseCase.execute();
        return entryMovement.map(EntryMovementMapper.toJSON)
    }
}