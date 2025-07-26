// src/infra/graphql/dto/category.dto.ts

import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class CategoryType {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    color: string;

    @Field()
    active: boolean;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;
}
