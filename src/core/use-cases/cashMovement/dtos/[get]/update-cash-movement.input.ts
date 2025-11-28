import { InputType, Field, Float } from '@nestjs/graphql';
import { CashMovementCategory } from '../../../../../infra/graphql/enum/CashMovementCategory.enum';
import { CashMovementType } from '../../../../../infra/graphql/enum/CashMovementType.enum';

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
