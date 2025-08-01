// src/infra/graphql/resolvers/categories.resolver.ts
import { Resolver, Query, Mutation, Args, ArgsType, InputType, Field, ObjectType, ID } from '@nestjs/graphql';
import { Category } from 'src/core/entities/category.entity';
import { FindAllCategoriesUseCase } from 'src/core/use-cases/category/find-all-categories.use.case';
import { CreateCategoryUseCase } from 'src/core/use-cases/category/create-category.use-case';
import { CategoryType } from '../dto/category.dto';
import { FindActiveCategoriesUseCase } from 'src/core/use-cases/category/find-by-active-categories.use-case';

@InputType()
export class CreateCategoryInput {
    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    color: string;

    @Field()
    active: boolean;
}


@ObjectType()
export class CategoryDto {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field()
    status: string;
}


@Resolver(() => Category)
export class CategoriesResolver {
    constructor(
        private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
        private readonly createCategoryUseCase: CreateCategoryUseCase,
        private readonly findActiveCategoriesUseCase: FindActiveCategoriesUseCase
    ) { }

    @Query(() => [CategoryType])
    async categories(): Promise<CategoryType[]> {
        const categories = await this.findAllCategoriesUseCase.execute();
        return categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description ?? undefined,
            color: "placeholder", // adapta se necessário
            active: category.status === 'ACTIVE',
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        }));
    }

    @Mutation(() => CategoryType)
    async createCategory(@Args('input') input: CreateCategoryInput): Promise<CategoryType> {
        const dto = {
            name: input.name,
            description: input.description,
            status: input.active ? "ACTIVE" as const : "INACTIVE" as const
        };
        const category = await this.createCategoryUseCase.execute(dto);

        return {
            id: category.id,
            name: category.name,
            description: category.description ?? '',
            color: input.color, // ou pega de category se existir
            active: category.status === 'ACTIVE',
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString()
        };
    }

    @Query(() => [CategoryDto], { name: 'categoriesActive' })
    async categoriesActive() {
        return this.findActiveCategoriesUseCase.execute()
    }
}