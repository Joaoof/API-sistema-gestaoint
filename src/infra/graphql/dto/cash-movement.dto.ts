import { ObjectType, Field, Float } from '@nestjs/graphql';
import { CashMovementType } from '../enum/cash-movement-type.enum';
import { CashMovementCategory } from '../enum/cash-movement-category.enum';

@ObjectType()
export class CashMovementGraphQL {
    @Field(() => String)
    id: string;

    @Field(() => CashMovementType)
    type: CashMovementType;

    @Field(() => CashMovementCategory)
    category: CashMovementCategory;

    @Field(() => Float)
    value: number;

    @Field(() => String)
    description: string;

    @Field(() => Date, { nullable: true })
    date: Date;

    @Field(() => String)
    user_id: string;
}
