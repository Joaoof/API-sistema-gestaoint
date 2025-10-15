import { InputType, Field, Float } from '@nestjs/graphql';
import { CashMovementCategory } from '../../../../infra/graphql/enum/cash-movement-category.enum';
import { CashMovementType } from '../../../../infra/graphql/enum/cash-movement-type.enum';

@InputType()
export class UpdateCashMovementInput {
    @Field(() => String)
    type: CashMovementType; // ENTRY | EXIT

    @Field(() => Float)
    value: number;

    @Field(() => String)
    category: CashMovementCategory; // SALE | EXPENSE | etc.

    @Field(() => String)
    description: string;

    @Field({ nullable: true })
    date: Date;
}
