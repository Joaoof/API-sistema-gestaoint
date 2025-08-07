import { InputType, Field, Float } from '@nestjs/graphql';
import { CashMovementType } from '../enum/cash-movement-type.enum';
import { CashMovementCategory } from '../enum/cash-movement-category.enum';

@InputType()
export class CreateCashMovementInput {
    @Field(() => String)
    type: CashMovementType; // ENTRY | EXIT

    @Field(() => Float)
    value: number;

    @Field(() => String)
    category: CashMovementCategory; // SALE | EXPENSE | etc.

    @Field(() => String)
    description: string;
}
