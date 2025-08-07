import { InputType, Field, Int } from '@nestjs/graphql';
import { EntryTypeClient } from './entry-type-client.enum';

@InputType()
export class CreateEntryMovementInput {
    @Field(() => EntryTypeClient)
    typeEntry: EntryTypeClient;

    @Field(() => Int)
    value: number;

    @Field({ nullable: true })
    description?: string;
}   