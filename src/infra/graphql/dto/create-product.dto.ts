// src/modules/product/dtos/create-product.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateProductInput {
    @Field(() => String)
    nameProduct: string;

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
}