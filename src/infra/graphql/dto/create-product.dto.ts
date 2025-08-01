// src/modules/product/dtos/create-product.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';
import { UserDto } from './user.dto';

@InputType()
export class CreateProductInput {
    @Field(() => String)
    name: string;

    @Field(() => Int)
    quantity: number;

    @Field(() => String)
    costPrice: string; // Decimal como string

    @Field(() => String)
    salePrice: string;

    @Field(() => String, { nullable: true })
    description?: string;

    @Field(() => String, { nullable: true })
    categoryId?: string;

    @Field(() => String, { nullable: true })
    supplierId?: string;

    // Se você tem o DTO do usuário
    @Field(() => UserDto, { nullable: true })
    createdBy?: UserDto;
}