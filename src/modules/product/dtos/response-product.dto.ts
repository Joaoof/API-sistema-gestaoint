import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class ProductResponseDto {
    @Field()
    id: string;

    @Field()
    nameProduct: string;

    @Field(() => Int)
    quantity: number;

    @Field(() => Float)
    costPrice: number;

    @Field(() => Float)
    salePrice: number;

    @Field()
    categoryId: string;

    @Field({ nullable: true })
    supplierId?: string;

    @Field({ nullable: true })
    description?: string;
}
