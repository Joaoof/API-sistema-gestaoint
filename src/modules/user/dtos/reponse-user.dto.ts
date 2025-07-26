import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserResponseDto {
    @Field()
    id: string;

    @Field()
    email: string;

    @Field()
    password_hash: string;

    @Field()
    name: string;

    @Field()
    role: string;

    @Field()
    is_active: boolean;
}