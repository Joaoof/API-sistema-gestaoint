import { InputType, Field, Int } from '@nestjs/graphql';
import { UserDto } from './user.dto';

@InputType()
export class CreateCashMovementInput {
    @Field(() => String)
    type: string;

    @Field(() => Int)
    value: number;

    @Field({ nullable: true })
    description?: string;
}