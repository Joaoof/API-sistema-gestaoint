// dto/find-all-cash-movement.input.ts
import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class FindAllCashMovementInput {
    @Field({ nullable: true })
    search?: string;

    @Field({ nullable: true })
    type?: 'ENTRY' | 'EXIT';

    @Field({ nullable: true })
    category?: 'SALE' | 'CHANGE' | 'OTHER_IN' | 'EXPENSE' | 'WITHDRAWAL' | 'PAYMENT';

    @Field({ nullable: true })
    dateFrom?: Date;

    @Field({ nullable: true })
    dateTo?: Date;

    @Field(() => Float, { nullable: true })
    valueMin?: number;

    @Field(() => Float, { nullable: true })
    valueMax?: number;
}