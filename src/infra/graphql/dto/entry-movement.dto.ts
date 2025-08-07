import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';
import { EntryTypeClient } from './entry-type-client.enum';

@ObjectType()
export class EntryMovementGraphQL {
    @Field(() => ID)
    id: string;

    @Field()
    user_id: string;

    @Field(() => EntryTypeClient)
    typeEntry: EntryTypeClient;

    @Field(() => Float)
    value: number;

    @Field({ nullable: true })
    description?: string;

    @Field()
    createdAt: Date;
}
